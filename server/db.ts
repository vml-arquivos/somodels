import { contactLinks, defaultSiteSettings, portfolioCategories } from "../shared/portfolio";
import { createHash, randomUUID } from "node:crypto";
import { and, asc, desc, eq, getTableColumns, like, ne, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  ageVerifications,
  analyticsDaily,
  authSessions,
  auditLogs,
  blocks,
  contactMessages,
  creditWallets,
  emailVerifications,
  favorites,
  identityVerifications,
  InsertProfile,
  InsertProfileMedia,
  moderationCases,
  passwordResetTokens,
  financeEntries,
  plans,
  premiumEntitlements,
  profileMedia,
  profiles,
  siteSettings,
  subscriptions,
  userMfa,
  users,
} from "../drizzle/schema";
import { ENV, isAgeVerificationConfigured } from "./_core/env";
import { assertIdentityReviewAllowed, identityValidityDays } from "./identity-review";
import { decryptSecret, encryptSecret, generateTotpSecret, verifyTotp } from "./totp";
import {
  canActOnProfile,
  decodeReportReason,
  encodeReportReason,
  priorityForReport,
  type ReportCategory,
} from "../shared/safety";
import { createOpaqueToken, hashPassword } from "./auth-crypto";
import {
  buildProfileContentDigest,
  currentPortfolioTerms,
  evaluateProfileTermsAcceptance,
} from "./profile-terms";
import { getPublicationGateBlockers } from "./publication-gates";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try {
      _db = drizzle(ENV.databaseUrl);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
    }
  }
  return _db;
}

export async function isDatabaseReady() {
  const db = await getDb();
  if (!db) return false;
  try {
    await db
      .select({ value: sql<number>`1` })
      .from(users)
      .limit(1);
    // Readiness must validate the schema required by the running release, not
    // only that MySQL accepts a connection. This prevents Coolify from marking
    // a container healthy when the application code is ahead of its migrations.
    await db.execute(sql`SELECT \`portfolioReviewed\` FROM \`profiles\` LIMIT 0`);
    await db.execute(sql`SELECT \`priceFromCents\`, \`services\`, \`attendancePlaces\` FROM \`profiles\` LIMIT 0`);
    await db.execute(sql`SELECT \`availableUntil\` FROM \`profiles\` LIMIT 0`);
    await db.execute(sql`SELECT \`isFeatured\`, \`durationDays\`, \`sortOrder\`, \`benefits\` FROM \`plans\` LIMIT 0`);
    await db.execute(sql`SELECT \`source\`, \`note\`, \`activatedBy\` FROM \`subscriptions\` LIMIT 0`);
    await db.execute(sql`SELECT \`id\`, \`secretEnc\`, \`lastStep\` FROM \`user_mfa\` LIMIT 0`);
    await db.execute(sql`SELECT \`id\`, \`topic\`, \`status\` FROM \`contact_messages\` LIMIT 0`);
    await db.execute(sql`SELECT \`adminFunction\` FROM \`users\` LIMIT 0`);
    await db.execute(sql`SELECT \`id\` FROM \`site_settings\` LIMIT 0`);
    await db.execute(sql`SELECT \`id\` FROM \`finance_entries\` LIMIT 0`);
    return true;
  } catch (error) {
    console.warn("[Database] Health check failed:", error);
    return false;
  }
}

export async function upsertUser(user: any): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: any = {
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    lastSignedIn: user.lastSignedIn ?? new Date(),
  };
  // Partial OAuth/session refreshes commonly contain only openId and lastSignedIn.
  // Never turn omitted identity fields into NULL on an existing local account.
  const updateSet: any = { lastSignedIn: values.lastSignedIn };
  if (user.name !== undefined && user.name !== null) updateSet.name = user.name;
  if (user.email !== undefined && user.email !== null)
    updateSet.email = user.email;
  if (user.loginMethod !== undefined && user.loginMethod !== null)
    updateSet.loginMethod = user.loginMethod;
  if (user.role) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (user.emailVerifiedAt !== undefined) {
    values.emailVerifiedAt = user.emailVerifiedAt;
    updateSet.emailVerifiedAt = user.emailVerifiedAt;
  }
  await db
    .insert(users)
    .values(values)
    .onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return rows[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  return rows[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0];
}

export async function createLocalUser(input: {
  email: string;
  name: string;
  password: string;
  role: "user" | "admin" | "super_admin" | "dev";
  mustChangePassword?: boolean;
  rejectExisting?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);
  const openId = `local:${createHash("sha256").update(email).digest("hex").slice(0, 48)}`;
  const existing =
    (await getUserByEmail(email)) ?? (await getUserByOpenId(openId));
  if (existing) {
    if (input.rejectExisting) throw new Error("Conta já existente");
    // Bootstrap must never reactivate, promote, rename or reset an existing account.
    return existing;
  }
  await db.insert(users).values({
    openId,
    email,
    name: input.name,
    loginMethod: "password",
    passwordHash,
    emailVerifiedAt: null,
    mustChangePassword: input.mustChangePassword ?? true,
    role: input.role,
    accountStatus: "active",
  });
  return getUserByEmail(email);
}

export async function resetBootstrapDevAccount(email: string, password: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await getUserByEmail(normalizedEmail);
  if (!existing || existing.role !== "dev") return false;

  await db.transaction(async tx => {
    await tx
      .update(users)
      .set({
        passwordHash: await hashPassword(password),
        mustChangePassword: false,
      })
      .where(eq(users.id, existing.id));
    await tx
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(eq(authSessions.userId, existing.id));
    await tx.insert(auditLogs).values({
      actorUserId: existing.id,
      action: "bootstrap_dev.password_rotated",
      entityType: "user",
      entityId: existing.id,
      metadata: JSON.stringify({ email: normalizedEmail }),
    });
  });
  return true;
}

export async function updateUserPassword(userId: number, password: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(password),
      mustChangePassword: false,
    })
    .where(eq(users.id, userId));
}

export async function updateUserName(userId: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .update(users)
    .set({ name: name.trim() })
    .where(eq(users.id, userId));
  await writeAuditLog({
    actorUserId: userId,
    action: "user.name_updated",
    entityType: "user",
    entityId: userId,
  });
  return getUserById(userId);
}

export async function anonymizeOwnAccount(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.transaction(async tx => {
    const [account] = await tx
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .for("update");
    if (!account) throw new Error("Conta não encontrada");
    if (account.role !== "user")
      throw new Error("Contas administrativas precisam ser encerradas por outro administrador");

    await tx
      .update(users)
      .set({
        name: "Conta excluída",
        email: null,
        passwordHash: null,
        emailVerifiedAt: null,
        openId: `deleted:${userId}:${createOpaqueToken().slice(0, 16)}`,
        accountStatus: "suspended",
      })
      .where(eq(users.id, userId));
    await tx
      .update(profiles)
      .set({
        isPublished: false,
        status: "suspended",
        phone: null,
        whatsapp: null,
        telegram: null,
        portfolioReviewed: false,
      })
      .where(eq(profiles.ownerId, userId));
    await tx.delete(favorites).where(eq(favorites.userId, userId));
    await tx.delete(blocks).where(eq(blocks.userId, userId));
    await tx
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(eq(authSessions.userId, userId));
    await tx
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, userId));
    await tx.insert(auditLogs).values({
      actorUserId: userId,
      action: "user.self_anonymized",
      entityType: "user",
      entityId: userId,
      metadata: JSON.stringify({ deletionMode: "soft", preferencesDeleted: true }),
    });
  });
  return { success: true as const };
}

export async function createAuthSession(
  userId: number,
  tokenHash: string,
  expiresAt: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const inserted = await db
    .insert(authSessions)
    .values({ userId, tokenHash, expiresAt });
  return Number(inserted[0].insertId);
}

export async function getUserBySessionTokenHash(tokenHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select({ user: users, session: authSessions })
    .from(authSessions)
    .innerJoin(users, eq(users.id, authSessions.userId))
    .where(
      and(
        eq(authSessions.tokenHash, tokenHash),
        sql`${authSessions.revokedAt} IS NULL`,
        sql`${authSessions.expiresAt} > UTC_TIMESTAMP()`,
        eq(users.accountStatus, "active")
      )
    )
    .limit(1);
  if (!rows[0]) return undefined;
  await db
    .update(authSessions)
    .set({ lastSeenAt: new Date() })
    .where(eq(authSessions.id, rows[0].session.id));
  return rows[0].user;
}

export async function revokeAuthSession(tokenHash: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(eq(authSessions.tokenHash, tokenHash));
}

export async function revokeAllAuthSessions(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(authSessions.userId, userId),
        sql`${authSessions.revokedAt} IS NULL`
      )
    );
}

export async function createAgeVerificationSession(
  sessionTokenHash: string,
  options?: { status?: "pending" | "approved"; provider?: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const expiresAt = new Date(
    Date.now() + ENV.ageVerificationTtlHours * 60 * 60 * 1000
  );
  await db
    .insert(ageVerifications)
    .values({
      sessionTokenHash,
      provider: options?.provider ?? (ENV.ageVerificationProvider || null),
      status: options?.status ?? "pending",
      expiresAt,
      jurisdiction: "BR",
    })
    .onDuplicateKeyUpdate({
      set: {
        status: options?.status ?? "pending",
        provider: options?.provider ?? (ENV.ageVerificationProvider || null),
        expiresAt,
        updatedAt: new Date(),
      },
    });
  return {
    status: (options?.status ?? "pending") as "pending" | "approved",
    expiresAt,
  };
}

export async function getApprovedAgeVerification(sessionTokenHash: string) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: ageVerifications.id })
    .from(ageVerifications)
    .where(
      and(
        eq(ageVerifications.sessionTokenHash, sessionTokenHash),
        eq(ageVerifications.status, "approved"),
        sql`${ageVerifications.expiresAt} > UTC_TIMESTAMP()`
      )
    )
    .limit(1);
  return Boolean(rows[0]);
}

export async function getIdentityVerification(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(identityVerifications)
    .where(eq(identityVerifications.userId, userId))
    .orderBy(desc(identityVerifications.updatedAt))
    .limit(1);
  return rows[0];
}

export async function writeAuditLog(input: {
  actorUserId?: number | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values({
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    metadata: JSON.stringify(input.metadata ?? {}),
  });
}

async function readProfileTermsStatus(executor: any, profile: any) {
  const media = await executor
    .select({
      id: profileMedia.id,
      kind: profileMedia.kind,
      title: profileMedia.title,
      description: profileMedia.description,
      storageHash: profileMedia.storageHash,
      mimeType: profileMedia.mimeType,
      sortOrder: profileMedia.sortOrder,
    })
    .from(profileMedia)
    .where(eq(profileMedia.profileId, profile.id))
    .orderBy(asc(profileMedia.id));
  const [latest] = await executor
    .select({
      actorUserId: auditLogs.actorUserId,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.action, "profile.terms.accepted"),
        eq(auditLogs.entityType, "profile"),
        eq(auditLogs.entityId, profile.id)
      )
    )
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(1);
  return evaluateProfileTermsAcceptance(profile, media, latest ?? null);
}

export async function getProfilePublicationReadiness(profileId: number, executor?: any) {
  const db = executor ?? (await getDb());
  if (!db) throw new Error("Database unavailable");
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, profileId))
    .limit(1);
  if (!profile) throw new Error("Perfil não encontrado");
  const [owner] = await db
    .select()
    .from(users)
    .where(eq(users.id, profile.ownerId))
    .limit(1);
  const media = await db
    .select()
    .from(profileMedia)
    .where(eq(profileMedia.profileId, profileId));
  const terms = await readProfileTermsStatus(db, profile);
  const [siteRow] = await db
    .select({ value: siteSettings.value })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);
  let showGallery = defaultSiteSettings.showGallery;
  try {
    showGallery = siteRow ? Boolean(JSON.parse(siteRow.value).showGallery) : defaultSiteSettings.showGallery;
  } catch {
    showGallery = false;
  }
  let identityApproved = !ENV.requireIdentityVerification;
  if (ENV.requireIdentityVerification) {
    const [identity] = owner
      ? await db
          .select()
          .from(identityVerifications)
          .where(eq(identityVerifications.userId, owner.id))
          .orderBy(desc(identityVerifications.updatedAt))
          .limit(1)
      : [];
    identityApproved = identity?.status === "approved" && !(identity.expiresAt && identity.expiresAt <= new Date());
  }
  const categories = parseJson(profile.categories);
  const approvedMedia = media.filter((item: any) => item.status === "approved" && !item.isPremium);
  const gates = getPublicationGateBlockers({
    ownerActive: owner?.accountStatus === "active",
    profileActive: profile.isActive && !profile.deletedAt,
    identityApproved,
    termsCurrent: terms.current,
    termsReason: terms.reason,
    profileComplete: Boolean(profile.stageName && profile.slug && profile.city && profile.description),
    categoriesValid: Array.isArray(categories) && categories.length > 0 && categories.every((category: unknown) => typeof category === "string" && (portfolioCategories as readonly string[]).includes(category)),
    approvedMediaCount: approvedMedia.length,
    pendingMediaCount: media.filter((item: any) => item.status === "pending").length,
    isDemo: Boolean(profile.isDemo),
    isTest: Boolean(profile.isTest),
    publicAccessEnabled: ENV.publicAccessEnabled,
    publicLaunchEnabled: ENV.publicLaunchEnabled,
    adultMarketplaceEnabled: ENV.adultMarketplaceEnabled,
    escortListingsEnabled: ENV.escortListingsEnabled,
    robotsNoIndex: ENV.robotsNoIndex,
    requireAgeVerification: ENV.requireAgeVerification && !isAgeVerificationConfigured(),
    showGallery,
    reportsEnabled: ENV.reportsEnabled,
    blockingEnabled: ENV.blockingEnabled,
  });
  return {
    ...gates,
    terms,
    approvedMediaCount: approvedMedia.length,
    pendingMediaCount: media.filter((item: any) => item.status === "pending").length,
    ownerActive: owner?.accountStatus === "active",
    identityApproved,
  };
}

export async function getProfileTermsStatus(profileId: number, ownerId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, profileId))
    .limit(1);
  if (!profile) throw new Error("Perfil não encontrado");
  if (ownerId !== undefined && profile.ownerId !== ownerId)
    throw new Error("Perfil não pertence à conta");
  return readProfileTermsStatus(db, profile);
}

export async function acceptProfileTerms(ownerId: number, profileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.transaction(async tx => {
    const [profile] = await tx
      .select()
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .for("update");
    if (!profile || profile.ownerId !== ownerId)
      throw new Error("Perfil não pertence à conta");
    const media = await tx
      .select({
        id: profileMedia.id,
        kind: profileMedia.kind,
        title: profileMedia.title,
        description: profileMedia.description,
        storageHash: profileMedia.storageHash,
        mimeType: profileMedia.mimeType,
        sortOrder: profileMedia.sortOrder,
      })
      .from(profileMedia)
      .where(eq(profileMedia.profileId, profileId))
      .orderBy(asc(profileMedia.id));
    const terms = currentPortfolioTerms();
    const contentDigest = buildProfileContentDigest(profile, media);
    await tx.insert(auditLogs).values({
      actorUserId: ownerId,
      action: "profile.terms.accepted",
      entityType: "profile",
      entityId: profileId,
      metadata: JSON.stringify({
        termsVersion: terms.termsVersion,
        termsHash: terms.termsHash,
        termsText: terms.termsText,
        contentDigest,
        adultConfirmed: true,
        rightsConfirmed: true,
        responsibilityConfirmed: true,
      }),
    });
  });
  return getProfileTermsStatus(profileId, ownerId);
}

const parseJson = (value: string | null | undefined) => {
  try {
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
};
const serialize = (value: unknown) => JSON.stringify(value ?? []);
// Escapa curingas do LIKE para que o termo digitado seja sempre literal.
const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");

export function hydrateProfile(row: any) {
  return {
    ...row,
    categories: parseJson(row.categories),
    attributes: parseJson(row.attributes),
    contactOptions: parseJson(row.contactOptions),
    preferences: parseJson(row.preferences),
    languages: parseJson(row.languages),
    paymentMethods: parseJson(row.paymentMethods),
    services: parseJson(row.services),
    attendancePlaces: parseJson(row.attendancePlaces),
    priceFromCents: row.priceFromCents ?? null,
    demoContactDisabled: !ENV.demoContactsEnabled,
  };
}

export function hydratePublicProfile(row: any) {
  const categories = parseJson(row.categories);
  const attributes = parseJson(row.attributes);
  const contactOptions = parseJson(row.contactOptions);
  const preferences = parseJson(row.preferences);
  const languages = parseJson(row.languages);
  const paymentMethods = parseJson(row.paymentMethods);
  const services = parseJson(row.services);
  const attendancePlaces = parseJson(row.attendancePlaces);
  const contactAllowed = !row.isDemo && !row.isTest && row.portfolioReviewed;
  return {
    id: row.id,
    slug: row.slug,
    stageName: row.stageName,
    description: row.description ?? null,
    age: row.age ?? null,
    city: row.city,
    region: row.region ?? null,
    locationNote: row.locationNote ?? null,
    categories,
    attributes,
    preferences,
    languages,
    paymentMethods,
    services,
    attendancePlaces,
    priceFromCents: row.priceFromCents ?? null,
    identityVerified: Boolean(Number(row.identityVerified ?? 0)),
    isSponsored: Boolean(Number(row.isSponsored ?? 0)),
    availabilityLabel: row.availabilityLabel ?? null,
    isAvailableNow:
      Boolean(row.isAvailableNow) &&
      (!row.availableUntil || new Date(row.availableUntil) > new Date()),
    availableUntil: row.availableUntil ?? null,
    avatarUrl: row.avatarUrl ?? null,
    isFeatured: Boolean(row.isFeatured),
    updatedAt: row.updatedAt,
    phone: contactAllowed ? row.phone ?? null : null,
    whatsapp: contactAllowed ? row.whatsapp ?? null : null,
    telegram: contactAllowed ? row.telegram ?? null : null,
    contactOptions: contactAllowed
      ? contactOptions
      : row.isDemo
        ? ["Contato indisponível"]
        : [],
    demoContactDisabled: !contactAllowed,
  };
}

function hydratePublicMedia(row: any) {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title ?? null,
    description: row.description ?? null,
    url: row.isPremium ? null : row.url,
    isPremium: Boolean(row.isPremium),
    sortOrder: Number(row.sortOrder ?? 0),
  };
}

function activeProfileOwner() {
  return sql`EXISTS (SELECT 1 FROM ${users} WHERE ${users.id} = ${profiles.ownerId} AND ${users.accountStatus} = 'active')`;
}

// Subconsulta com alias explícito (iv) para não depender da resolução de colunas
// sem qualificador. A validade é comparada com um parâmetro de data da aplicação
// (mesmo fuso usado ao gravar), não com NOW() do servidor MySQL.
function identityApprovedExists() {
  return sql`EXISTS (SELECT 1 FROM identity_verifications iv WHERE iv.userId = ${profiles.ownerId} AND iv.status = 'approved' AND (iv.expiresAt IS NULL OR iv.expiresAt > ${new Date()}))`;
}

// Titular com assinatura ativa, vigente e de plano em destaque. Só vale quando a
// flag de superfícies patrocinadas estiver ligada; sempre exibido como rótulo.
function sponsoredExists() {
  if (!ENV.sponsoredListingsEnabled) return sql`0`;
  return sql`EXISTS (SELECT 1 FROM subscriptions sb INNER JOIN plans pl ON pl.id = sb.planId WHERE sb.userId = ${profiles.ownerId} AND sb.status = 'active' AND sb.currentPeriodEndsAt > ${new Date()} AND pl.isFeatured = 1)`;
}

// "Disponível agora" só vale dentro da validade escolhida pelo titular.
function availableNowSql() {
  return sql`(${profiles.isAvailableNow} = 1 AND (${profiles.availableUntil} IS NULL OR ${profiles.availableUntil} > ${new Date()}))`;
}

// Colunas do perfil + selo derivado de identidade aprovada e dentro da validade.
// O selo nunca expõe dados do documento: apenas um booleano público.
function publicProfileSelection() {
  return {
    ...getTableColumns(profiles),
    identityVerified: sql<number>`${identityApprovedExists()}`.as(
      "identityVerified"
    ),
    isSponsored: sql<number>`${sponsoredExists()}`.as("isSponsored"),
  };
}

type PublicListFilters = {
  search?: string;
  city?: string;
  region?: string;
  category?: string;
  attribute?: string;
  ageMin?: number;
  ageMax?: number;
  availableNow?: boolean;
  priceMaxCents?: number;
  service?: string;
  place?: string;
  verifiedOnly?: boolean;
  sort?: "featured" | "recent" | "available" | "price_asc";
  limit?: number;
  offset?: number;
  publicAllowed?: boolean;
};

function buildPublicConditions(input: PublicListFilters) {
  const conditions: any[] = [
    eq(profiles.status, "approved"),
    eq(profiles.isPublished, true),
    eq(profiles.portfolioReviewed, true),
    eq(profiles.isActive, true),
    sql`${profiles.deletedAt} IS NULL`,
    activeProfileOwner(),
  ];
  if (!ENV.allowFakeData)
    conditions.push(eq(profiles.isDemo, false), eq(profiles.isTest, false));
  if (input.city) conditions.push(like(profiles.city, `%${input.city}%`));
  if (input.region) conditions.push(like(profiles.region, `%${input.region}%`));
  if (input.search)
    conditions.push(
      or(
        like(profiles.stageName, `%${input.search}%`),
        like(profiles.description, `%${input.search}%`)
      )
    );
  if (input.category)
    conditions.push(like(profiles.categories, `%${input.category}%`));
  if (input.attribute)
    conditions.push(like(profiles.attributes, `%${input.attribute}%`));
  if (input.ageMin !== undefined)
    conditions.push(sql`${profiles.age} >= ${input.ageMin}`);
  if (input.ageMax !== undefined)
    conditions.push(sql`${profiles.age} <= ${input.ageMax}`);
  if (input.availableNow) conditions.push(availableNowSql());
  if (input.priceMaxCents !== undefined)
    conditions.push(
      sql`${profiles.priceFromCents} IS NOT NULL AND ${profiles.priceFromCents} <= ${input.priceMaxCents}`
    );
  if (input.service)
    conditions.push(like(profiles.services, `%${escapeLike(input.service)}%`));
  if (input.place)
    conditions.push(like(profiles.attendancePlaces, `%${escapeLike(input.place)}%`));
  if (input.verifiedOnly)
    conditions.push(identityApprovedExists());
  return conditions;
}

export async function listPublishedProfiles(input: PublicListFilters) {

  const db = await getDb();
  if (!db || input.publicAllowed === false) return [];
  const conditions = buildPublicConditions(input);
  // Patrocinados (rotulados) ficam à frente apenas nas ordenações "relevantes" e
  // "disponíveis"; ordenar por preço ou recência não é afetado.
  const sponsoredFirst = ENV.sponsoredListingsEnabled ? [desc(sponsoredExists())] : [];
  const order =
    input.sort === "recent"
      ? [desc(profiles.updatedAt), desc(profiles.id)]
      : input.sort === "price_asc"
        ? [
            sql`${profiles.priceFromCents} IS NULL`,
            asc(profiles.priceFromCents),
            desc(profiles.isFeatured),
            desc(profiles.id),
          ]
      : input.sort === "available"
        ? [
            ...sponsoredFirst,
            desc(availableNowSql()),
            desc(profiles.isFeatured),
            desc(profiles.updatedAt),
            desc(profiles.id),
          ]
        : [
            ...sponsoredFirst,
            desc(profiles.isFeatured),
            desc(profiles.updatedAt),
            desc(profiles.id),
          ];
  const rows = await db
    .select(publicProfileSelection())
    .from(profiles)
    .where(and(...conditions))
    .orderBy(...order)
    .limit(Math.min(input.limit ?? 60, 60))
    .offset(Math.min(input.offset ?? 0, 10000));
  return Promise.all(
    rows.map(async row => {
      const hydrated = hydratePublicProfile(row);
      if (hydrated.demoContactDisabled) return hydrated;
      const terms = await readProfileTermsStatus(db, row);
      return terms.current
        ? { ...hydrated, contactAuthorizationCurrent: true }
        : {
            ...hydrated,
            phone: null,
            whatsapp: null,
            telegram: null,
            contactOptions: [],
            demoContactDisabled: true,
            contactAuthorizationCurrent: false,
          };
    })
  );
}

export async function countPublishedProfiles(input: Omit<PublicListFilters, "limit" | "offset" | "sort">) {
  const db = await getDb();
  if (!db || input.publicAllowed === false) return 0;
  const [row] = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(profiles)
    .where(and(...buildPublicConditions(input)));
  return Number(row?.total ?? 0);
}

// Todas as URLs públicas para o sitemap (até o limite de 50.000 por arquivo).
export async function listSitemapEntries() {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [
    eq(profiles.status, "approved"),
    eq(profiles.isPublished, true),
    eq(profiles.portfolioReviewed, true),
    eq(profiles.isActive, true),
    sql`${profiles.deletedAt} IS NULL`,
    activeProfileOwner(),
  ];
  if (!ENV.allowFakeData)
    conditions.push(eq(profiles.isDemo, false), eq(profiles.isTest, false));
  const rows = await db
    .select({
      slug: profiles.slug,
      city: profiles.city,
      categories: profiles.categories,
      updatedAt: profiles.updatedAt,
    })
    .from(profiles)
    .where(and(...conditions))
    .orderBy(desc(profiles.updatedAt))
    .limit(50000);
  return rows.map(row => ({
    slug: row.slug,
    city: row.city,
    categories: parseJson(row.categories) as string[],
    updatedAt: row.updatedAt,
  }));
}

export async function listPublicLocations(publicAllowed = true) {
  const db = await getDb();
  if (!db || !publicAllowed) return [];
  const conditions: any[] = [
    eq(profiles.status, "approved"),
    eq(profiles.isPublished, true),
    eq(profiles.portfolioReviewed, true),
    eq(profiles.isActive, true),
    sql`${profiles.deletedAt} IS NULL`,
    activeProfileOwner(),
  ];
  if (!ENV.allowFakeData)
    conditions.push(eq(profiles.isDemo, false), eq(profiles.isTest, false));
  return db
    .select({ city: profiles.city, region: profiles.region })
    .from(profiles)
    .where(and(...conditions))
    .groupBy(profiles.city, profiles.region)
    .orderBy(asc(profiles.city), asc(profiles.region))
    .limit(250);
}

export async function getPublicProfile(slug: string, publicAllowed = true) {
  const db = await getDb();
  if (!db || !publicAllowed) return null;
  const profileConditions: any[] = [
    activeProfileOwner(),
    eq(profiles.slug, slug),
    eq(profiles.status, "approved"),
    eq(profiles.isPublished, true),
    eq(profiles.portfolioReviewed, true),
    eq(profiles.isActive, true),
    sql`${profiles.deletedAt} IS NULL`,
  ];
  if (!ENV.allowFakeData)
    profileConditions.push(
      eq(profiles.isDemo, false),
      eq(profiles.isTest, false)
    );
  const rows = await db
    .select(publicProfileSelection())
    .from(profiles)
    .where(and(...profileConditions))
    .limit(1);
  if (!rows[0]) return null;
  const media = await db
    .select()
    .from(profileMedia)
    .where(
      and(
        eq(profileMedia.profileId, rows[0].id),
        eq(profileMedia.status, "approved")
      )
    )
    .orderBy(asc(profileMedia.sortOrder), desc(profileMedia.createdAt));
  const relatedConditions: any[] = [
    activeProfileOwner(),
    eq(profiles.status, "approved"),
    eq(profiles.isPublished, true),
    eq(profiles.portfolioReviewed, true),
    eq(profiles.isActive, true),
    sql`${profiles.deletedAt} IS NULL`,
    ne(profiles.id, rows[0].id),
    eq(profiles.city, rows[0].city),
  ];
  if (!ENV.allowFakeData)
    relatedConditions.push(
      eq(profiles.isDemo, false),
      eq(profiles.isTest, false)
    );
  const relatedRows = await db
    .select(publicProfileSelection())
    .from(profiles)
    .where(and(...relatedConditions))
    .orderBy(desc(profiles.isFeatured), desc(profiles.updatedAt), desc(profiles.id))
    .limit(4);
  const profileHydrated = hydratePublicProfile(rows[0]);
  const profileTerms = await readProfileTermsStatus(db, rows[0]);
  const profilePublic =
    !profileHydrated.demoContactDisabled && profileTerms.current
      ? { ...profileHydrated, contactAuthorizationCurrent: true }
      : {
          ...profileHydrated,
          phone: null,
          whatsapp: null,
          telegram: null,
          contactOptions: [],
          demoContactDisabled: true,
          contactAuthorizationCurrent: false,
        };
  const related = await Promise.all(
    relatedRows.map(async row => {
      const hydrated = hydratePublicProfile(row);
      if (hydrated.demoContactDisabled) return hydrated;
      const terms = await readProfileTermsStatus(db, row);
      return terms.current
        ? { ...hydrated, contactAuthorizationCurrent: true }
        : {
            ...hydrated,
            phone: null,
            whatsapp: null,
            telegram: null,
            contactOptions: [],
            demoContactDisabled: true,
            contactAuthorizationCurrent: false,
          };
    })
  );
  return { profile: profilePublic, media: media.map(hydratePublicMedia), related };
}

export async function getOwnerProfiles(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.ownerId, ownerId), sql`${profiles.deletedAt} IS NULL`))
    .orderBy(desc(profiles.updatedAt));
  return rows.map(hydrateProfile);
}

export async function getOwnerProfile(ownerId: number, id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(profiles)
    .where(
      and(
        eq(profiles.id, id),
        eq(profiles.ownerId, ownerId),
        sql`${profiles.deletedAt} IS NULL`
      )
    )
    .limit(1);
  if (!rows[0]) return null;
  const media = await db
    .select()
    .from(profileMedia)
    .where(eq(profileMedia.profileId, id))
    .orderBy(asc(profileMedia.sortOrder), desc(profileMedia.createdAt));
  return { profile: hydrateProfile(rows[0]), media };
}

export async function saveProfile(
  ownerId: number,
  input: Partial<Omit<InsertProfile, "ownerId">>,
  id?: number,
  submitForReview = false
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const identity = await getIdentityVerification(ownerId);
  if (
    submitForReview &&
    ENV.requireIdentityVerification &&
    identity?.status !== "approved"
  ) {
    throw new Error(
      "A verificação de identidade do anunciante é obrigatória antes do envio para análise"
    );
  }
  const currentRows = id
    ? await db
        .select()
        .from(profiles)
        .where(
          and(
            eq(profiles.id, id),
            eq(profiles.ownerId, ownerId),
            sql`${profiles.deletedAt} IS NULL`
          )
        )
        .limit(1)
    : [];
  const current = currentRows[0];
  if (id && !current) throw new Error("Perfil não pertence à conta ou está arquivado");
  const hydratedCurrent = current ? hydrateProfile(current) : {};
  const stageName = String(input.stageName ?? hydratedCurrent.stageName ?? "Rascunho sem nome").trim() || "Rascunho sem nome";
  const city = String(input.city ?? hydratedCurrent.city ?? "A definir").trim() || "A definir";
  const slugCandidate = String(
    input.slug ?? hydratedCurrent.slug ?? `rascunho-${ownerId}-${randomUUID().slice(0, 12)}`
  )
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const slug = slugCandidate || `rascunho-${ownerId}-${randomUUID().slice(0, 12)}`;
  const [slugOwner] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.slug, slug))
    .limit(1);
  if (slugOwner && slugOwner.id !== id)
    throw new Error("Este slug já está em uso; escolha outro endereço público");
  const categories = input.categories ?? hydratedCurrent.categories ?? [];
  const attributes = input.attributes ?? hydratedCurrent.attributes ?? [];
  const contactOptions = input.contactOptions ?? hydratedCurrent.contactOptions ?? [];
  const preferences = input.preferences ?? hydratedCurrent.preferences ?? [];
  const languages = input.languages ?? hydratedCurrent.languages ?? [];
  const paymentMethods = input.paymentMethods ?? hydratedCurrent.paymentMethods ?? [];
  const services = input.services ?? hydratedCurrent.services ?? [];
  const attendancePlaces = input.attendancePlaces ?? hydratedCurrent.attendancePlaces ?? [];
  const values: any = {
    stageName,
    slug,
    description: input.description ?? hydratedCurrent.description ?? null,
    city,
    region: input.region ?? hydratedCurrent.region ?? null,
    locationNote: input.locationNote ?? hydratedCurrent.locationNote ?? null,
    age: input.age ?? hydratedCurrent.age ?? null,
    avatarUrl: input.avatarUrl ?? hydratedCurrent.avatarUrl ?? null,
    categories: serialize(categories),
    attributes: serialize(attributes),
    contactOptions: serialize(contactOptions),
    preferences: serialize(preferences),
    languages: serialize(languages),
    paymentMethods: serialize(paymentMethods),
    services: serialize(services),
    attendancePlaces: serialize(attendancePlaces),
    availabilityLabel: input.availabilityLabel ?? hydratedCurrent.availabilityLabel ?? null,
    isAvailableNow: input.isAvailableNow ?? Boolean(hydratedCurrent.isAvailableNow),
    priceFromCents: input.priceFromCents ?? hydratedCurrent.priceFromCents ?? null,
    phone: input.phone !== undefined ? input.phone || null : hydratedCurrent.phone ?? null,
    whatsapp: input.whatsapp !== undefined ? input.whatsapp || null : hydratedCurrent.whatsapp ?? null,
    telegram: input.telegram !== undefined ? input.telegram || null : hydratedCurrent.telegram ?? null,
    portfolioReviewed: false,
    ownerId,
    ...(input.isAvailableNow ?? hydratedCurrent.isAvailableNow
      ? { availableUntil: current?.availableUntil ?? null }
      : { availableUntil: null }),
  };
  if (id) {
    await db
      .update(profiles)
      .set({
        ...values,
        status: submitForReview ? "pending" : "draft",
        isPublished: false,
        rejectionReason: null,
      })
      .where(and(eq(profiles.id, id), eq(profiles.ownerId, ownerId)));
    await writeAuditLog({
      actorUserId: ownerId,
      action: submitForReview ? "profile.submitted" : "profile.updated",
      entityType: "profile",
      entityId: id,
    });
    return id;
  }
  const inserted = await db
    .insert(profiles)
    .values({
      ...values,
      status: submitForReview ? "pending" : "draft",
      isPublished: false,
      isActive: true,
      deletedAt: null,
      isTest: ENV.allowFakeData,
      isDemo: ENV.allowFakeData,
      rejectionReason: null,
    });
  const profileId = Number(inserted[0].insertId);
  await writeAuditLog({
    actorUserId: ownerId,
    action: submitForReview ? "profile.submitted" : "profile.created",
    entityType: "profile",
    entityId: profileId,
  });
  return profileId;
}

export async function createMedia(
  ownerId: number,
  input: Omit<InsertProfileMedia, "storageHash"> & { storageHash?: string },
  actorUserId = ownerId,
  requireIdentity = true
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (requireIdentity) {
    const identity = await getIdentityVerification(ownerId);
    if (ENV.requireIdentityVerification && identity?.status !== "approved") {
      throw new Error(
        "A verificação de identidade do anunciante é obrigatória antes do upload"
      );
    }
  }
  const owned = await db
    .select({ id: profiles.id, isActive: profiles.isActive, deletedAt: profiles.deletedAt })
    .from(profiles)
    .where(and(eq(profiles.id, input.profileId), eq(profiles.ownerId, ownerId)))
    .limit(1);
  if (!owned[0]) throw new Error("Profile not owned by user");
  if (!owned[0].isActive || owned[0].deletedAt)
    throw new Error("O perfil está inativo ou excluído");
  if (
    !input.storageKey.startsWith(`profiles/${ownerId}/${input.profileId}/`) ||
    input.url !== `/manus-storage/${input.storageKey}`
  )
    throw new Error("Arquivo não pertence ao perfil");
  if (input.isPremium)
    throw new Error(
      "Conteúdo pago não está disponível nesta plataforma de portfólios"
    );
  const storageHash =
    input.storageHash ??
    createHash("sha256").update(input.storageKey).digest("hex");
  const inserted = await db
    .insert(profileMedia)
    .values({ ...input, storageHash, status: "pending" });
  const mediaId = Number(inserted[0].insertId);
  await writeAuditLog({
    actorUserId,
    action: actorUserId === ownerId ? "media.created" : "media.created_by_admin",
    entityType: "media",
    entityId: mediaId,
    metadata: actorUserId === ownerId ? undefined : { ownerUserId: ownerId },
  });
  return mediaId;
}

export async function hasPremiumAccess(userId: number, mediaId: number) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: premiumEntitlements.id })
    .from(premiumEntitlements)
    .where(
      and(
        eq(premiumEntitlements.userId, userId),
        eq(premiumEntitlements.mediaId, mediaId),
        eq(premiumEntitlements.status, "paid")
      )
    )
    .limit(1);
  return Boolean(rows[0]);
}

export async function createPremiumIntent(
  _userId: number,
  _mediaId: number
): Promise<never> {
  throw new Error(
    "Pagamentos por conteúdo não fazem parte da plataforma de portfólios"
  );
}

export async function listPendingProfiles() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.status, "pending"))
    .orderBy(desc(profiles.updatedAt));
  return rows.map(hydrateProfile);
}

export async function listAdminProfiles(input?: {
  search?: string;
  lifecycle?: "all" | "active" | "inactive" | "deleted";
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (input?.search?.trim()) {
    const search = input.search.trim();
    conditions.push(
      or(
        like(profiles.stageName, `%${search}%`),
        like(profiles.slug, `%${search}%`),
        like(profiles.city, `%${search}%`)
      )
    );
  }
  if (input?.lifecycle === "active") {
    conditions.push(eq(profiles.isActive, true), sql`${profiles.deletedAt} IS NULL`);
  } else if (input?.lifecycle === "inactive") {
    conditions.push(eq(profiles.isActive, false), sql`${profiles.deletedAt} IS NULL`);
  } else if (input?.lifecycle === "deleted") {
    conditions.push(sql`${profiles.deletedAt} IS NOT NULL`);
  }
  const rows = await db
    .select()
    .from(profiles)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(profiles.updatedAt))
    .limit(200);
  return rows.map(hydrateProfile);
}

export async function setProfileActive(
  id: number,
  isActive: boolean,
  actorUserId: number,
  reason?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.transaction(async tx => {
    const [profile] = await tx
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .for("update");
    if (!profile) throw new Error("Perfil não encontrado");
    if (profile.deletedAt) throw new Error("Restaure o perfil antes de ativá-lo");
    if (profile.isActive === isActive) return;
    if (!isActive) {
      await tx
        .update(profiles)
        .set({ isActive: false, isPublished: false, isFeatured: false })
        .where(eq(profiles.id, id));
    } else {
      await tx
        .update(profiles)
        .set({ isActive: true })
        .where(eq(profiles.id, id));
      const readiness =
        profile.status === "approved"
          ? await getProfilePublicationReadiness(id, tx)
          : null;
      const canPublish = profile.status === "approved" && Boolean(readiness?.ready);
      await tx
        .update(profiles)
        .set({
          isActive: true,
          isPublished: canPublish,
          isFeatured: canPublish && profile.isFeatured,
          rejectionReason: canPublish
            ? null
            : readiness?.blockers.length
              ? `Aprovado e oculto: ${readiness.blockers.join("; ")}`
              : profile.rejectionReason,
        })
        .where(eq(profiles.id, id));
    }
    await tx.insert(auditLogs).values({
      actorUserId,
      action: isActive ? "profile.activated" : "profile.deactivated",
      entityType: "profile",
      entityId: id,
      metadata: JSON.stringify({ reason: reason?.trim() || null }),
    });
  });
  return { success: true as const, isActive };
}

export async function softDeleteProfile(
  id: number,
  actorUserId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.transaction(async tx => {
    const [profile] = await tx
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .for("update");
    if (!profile) throw new Error("Perfil não encontrado");
    if (profile.deletedAt) throw new Error("Perfil já está excluído");
    await tx
      .update(profiles)
      .set({
        isActive: false,
        isPublished: false,
        isFeatured: false,
        portfolioReviewed: false,
        status: "suspended",
        deletedAt: new Date(),
      })
      .where(eq(profiles.id, id));
    await tx.insert(auditLogs).values({
      actorUserId,
      action: "profile.deleted",
      entityType: "profile",
      entityId: id,
      metadata: JSON.stringify({
        slug: profile.slug,
        stageName: profile.stageName,
        reason: "Exclusão lógica administrativa direta",
        deletionMode: "soft",
      }),
    });
  });
  return { success: true as const };
}

export async function restoreProfile(id: number, actorUserId: number, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.transaction(async tx => {
    const [profile] = await tx
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .for("update");
    if (!profile) throw new Error("Perfil não encontrado");
    if (!profile.deletedAt) throw new Error("Perfil não está excluído");
    await tx
      .update(profiles)
      .set({
        deletedAt: null,
        isActive: true,
        isPublished: false,
        isFeatured: false,
        portfolioReviewed: false,
        status: "draft",
        rejectionReason: null,
      })
      .where(eq(profiles.id, id));
    await tx.insert(auditLogs).values({
      actorUserId,
      action: "profile.restored",
      entityType: "profile",
      entityId: id,
      metadata: JSON.stringify({ reason: reason?.trim() || null }),
    });
  });
  return { success: true as const };
}

export async function listAdminUsers(actorRole = "admin") {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      accountStatus: users.accountStatus,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .where(actorRole === "dev" ? undefined : ne(users.role, "dev"))
    .orderBy(desc(users.createdAt))
    .limit(200);
}

export async function getAdminProfile(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1);
  if (!rows[0]) return null;
  const media = await db
    .select()
    .from(profileMedia)
    .where(eq(profileMedia.profileId, id))
    .orderBy(asc(profileMedia.sortOrder), desc(profileMedia.createdAt));
  return { profile: hydrateProfile(rows[0]), media };
}

export async function listPendingMedia() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(profileMedia)
    .where(eq(profileMedia.status, "pending"))
    .orderBy(desc(profileMedia.createdAt));
}

export async function moderateProfile(
  id: number,
  status: "approved" | "rejected" | "suspended" | "pending",
  isFeatured = false,
  rejectionReason?: string,
  actorUserId?: number,
  portfolioConfirmed = false
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (["rejected", "suspended"].includes(status) && !rejectionReason?.trim())
    throw new Error("Informe o motivo da decisão");
  await db.transaction(async tx => {
    const [profile] = await tx
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .for("update");
    if (!profile) throw new Error("Perfil não encontrado");
    if (profile.deletedAt) throw new Error("Restaure o perfil antes de moderá-lo");
    let publicationBlockers: string[] = [];
    if (status === "approved") {
      const categories = parseJson(profile.categories);
      if (
        !portfolioConfirmed ||
        !Array.isArray(categories) ||
        !categories.length ||
        categories.some(
          (c: string) => !(portfolioCategories as readonly string[]).includes(c)
        )
      )
        throw new Error(
          "Revise as categorias e confirme que este é um portfólio profissional autorizado"
        );
      const readiness = await getProfilePublicationReadiness(id, tx);
      if (readiness.approvalBlockers.length)
        throw new Error(readiness.approvalBlockers[0]);
      publicationBlockers = readiness.publicationBlockers;
    }
    const canPublish = status === "approved" && publicationBlockers.length === 0;
    await tx
      .update(profiles)
      .set({
        status,
        portfolioReviewed: status === "approved",
        isPublished: canPublish,
        isFeatured: canPublish && isFeatured,
        rejectionReason:
          status === "rejected"
            ? rejectionReason?.trim() ||
              "Ajustes necessários antes da publicação"
            : status === "approved" && publicationBlockers.length
              ? `Aprovado e oculto: ${publicationBlockers.join("; ")}`
              : null,
      })
      .where(eq(profiles.id, id));
    await tx
      .insert(auditLogs)
      .values({
        actorUserId: actorUserId ?? null,
        action: `profile.moderated.${status}`,
        entityType: "profile",
        entityId: id,
        metadata: JSON.stringify({
          isFeatured,
          portfolioConfirmed,
          publicationBlockers,
          rejectionReason: rejectionReason ?? null,
        }),
      });
  });
}

export async function moderateMedia(
  id: number,
  status: "approved" | "rejected" | "private",
  actorUserId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [hint] = await db
    .select({ profileId: profileMedia.profileId })
    .from(profileMedia)
    .where(eq(profileMedia.id, id))
    .limit(1);
  if (!hint) throw new Error("Mídia não encontrada");
  await db.transaction(async tx => {
    const [profile] = await tx
      .select()
      .from(profiles)
      .where(eq(profiles.id, hint.profileId))
      .for("update");
    const [media] = await tx
      .select()
      .from(profileMedia)
      .where(eq(profileMedia.id, id))
      .for("update");
    if (!profile || !media || media.profileId !== profile.id)
      throw new Error("Mídia não encontrada");
    if (status === "approved") {
      const terms = await readProfileTermsStatus(tx, profile);
      if (!terms.current)
        throw new Error(
          "O titular precisa aceitar o termo de responsabilidade vigente para o conteúdo atual antes da aprovação da mídia"
        );
      if (ENV.requireIdentityVerification) {
        const [identity] = await tx
          .select()
          .from(identityVerifications)
          .where(eq(identityVerifications.userId, profile.ownerId))
          .orderBy(desc(identityVerifications.updatedAt))
          .limit(1);
        if (
          identity?.status !== "approved" ||
          (identity.expiresAt && identity.expiresAt <= new Date())
        )
          throw new Error("O titular precisa de verificação de identidade válida");
      }
    }
    await tx.update(profileMedia).set({ status }).where(eq(profileMedia.id, id));
    if (profile.status === "approved") {
      const readiness = await getProfilePublicationReadiness(profile.id, tx);
      await tx
        .update(profiles)
        .set({
          isPublished: readiness.ready,
          rejectionReason: readiness.ready
            ? null
            : `Aprovado e oculto: ${readiness.blockers.join("; ")}`,
        })
        .where(eq(profiles.id, profile.id));
      if (profile.isPublished !== readiness.ready) {
        await tx.insert(auditLogs).values({
          actorUserId: actorUserId ?? null,
          action: readiness.ready ? "profile.published" : "profile.unpublished",
          entityType: "profile",
          entityId: profile.id,
          metadata: JSON.stringify({ blockers: readiness.blockers }),
        });
      }
    }
    await tx.insert(auditLogs).values({
      actorUserId: actorUserId ?? null,
      action: `media.moderated.${status}`,
      entityType: "media",
      entityId: id,
      metadata: "{}",
    });
  });
}

export async function getMediaByStorageHash(storageHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(profileMedia)
    .where(eq(profileMedia.storageHash, storageHash))
    .limit(1);
  return rows[0];
}

export async function isMediaProfilePublic(profileId: number) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: profiles.id })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.ownerId))
    .where(
      and(
        eq(profiles.id, profileId),
        eq(profiles.status, "approved"),
        eq(profiles.isPublished, true),
        eq(profiles.portfolioReviewed, true),
        eq(profiles.isActive, true),
        sql`${profiles.deletedAt} IS NULL`,
        eq(users.accountStatus, "active"),
        ...(!ENV.allowFakeData
          ? [eq(profiles.isDemo, false), eq(profiles.isTest, false)]
          : [])
      )
    )
    .limit(1);
  return Boolean(rows[0]);
}

export async function getMediaByStorageKey(storageKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(profileMedia)
    .where(eq(profileMedia.storageKey, storageKey))
    .limit(1);
  return rows[0];
}


async function requirePublicInteractionProfile(executor: any, profileId: number) {
  const conditions = [
    eq(profiles.id, profileId),
    eq(profiles.status, "approved"),
    eq(profiles.isPublished, true),
    eq(profiles.portfolioReviewed, true),
    eq(profiles.isActive, true),
    sql`${profiles.deletedAt} IS NULL`,
  ];
  if (!ENV.allowFakeData) {
    conditions.push(eq(profiles.isDemo, false), eq(profiles.isTest, false));
  }
  const [profile] = await executor
    .select()
    .from(profiles)
    .where(and(...conditions))
    .limit(1);
  if (!profile) throw new Error("Perfil indisponível");
  return profile;
}

export async function favoriteProfile(userId: number, profileId: number) {
  if (!ENV.favoritesEnabled) throw new Error("Favoritos ainda não estão habilitados");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const profile = await requirePublicInteractionProfile(db, profileId);
  if (!canActOnProfile(userId, profile.ownerId)) throw new Error("Não é possível favoritar o próprio perfil");
  await db
    .insert(favorites)
    .values({ userId, profileId })
    .onDuplicateKeyUpdate({ set: { profileId } });
  await writeAuditLog({
    actorUserId: userId,
    action: "profile.favorite.added",
    entityType: "profile",
    entityId: profileId,
  });
  return { favorited: true as const };
}

export async function unfavoriteProfile(userId: number, profileId: number) {
  if (!ENV.favoritesEnabled) throw new Error("Favoritos ainda não estão habilitados");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .delete(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.profileId, profileId)));
  await writeAuditLog({
    actorUserId: userId,
    action: "profile.favorite.removed",
    entityType: "profile",
    entityId: profileId,
  });
  return { favorited: false as const };
}

export async function getFavoriteStatus(userId: number, profileId: number) {
  if (!ENV.favoritesEnabled) return { enabled: false as const, favorited: false as const };
  const db = await getDb();
  if (!db) return { enabled: true as const, favorited: false as const };
  const [row] = await db
    .select({ id: favorites.id })
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.profileId, profileId)))
    .limit(1);
  return { enabled: true as const, favorited: Boolean(row) };
}

export async function listFavoriteProfiles(userId: number) {
  if (!ENV.favoritesEnabled) return [];
  const db = await getDb();
  if (!db) return [];
  const conditions = [
    eq(favorites.userId, userId),
    eq(profiles.status, "approved"),
    eq(profiles.isPublished, true),
    eq(profiles.portfolioReviewed, true),
    eq(profiles.isActive, true),
    sql`${profiles.deletedAt} IS NULL`,
  ];
  if (!ENV.allowFakeData) {
    conditions.push(eq(profiles.isDemo, false), eq(profiles.isTest, false));
  }
  const rows = await db
    .select({ profile: profiles, favoriteCreatedAt: favorites.createdAt })
    .from(favorites)
    .innerJoin(profiles, eq(profiles.id, favorites.profileId))
    .where(and(...conditions))
    .orderBy(desc(favorites.createdAt));
  return rows.map(row => ({
    ...hydratePublicProfile(row.profile),
    phone: null,
    whatsapp: null,
    telegram: null,
    contactOptions: [],
    favoriteCreatedAt: row.favoriteCreatedAt,
  }));
}

export async function blockProfile(userId: number, profileId: number) {
  if (!ENV.blockingEnabled) throw new Error("Bloqueios ainda não estão habilitados");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const profile = await requirePublicInteractionProfile(db, profileId);
  if (!canActOnProfile(userId, profile.ownerId)) throw new Error("Não é possível bloquear o próprio perfil");
  await db
    .insert(blocks)
    .values({ userId, blockedProfileId: profileId, blockedUserId: null })
    .onDuplicateKeyUpdate({ set: { blockedProfileId: profileId } });
  if (ENV.favoritesEnabled) {
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.profileId, profileId)));
  }
  await writeAuditLog({
    actorUserId: userId,
    action: "profile.blocked",
    entityType: "profile",
    entityId: profileId,
  });
  return { blocked: true as const };
}

export async function unblockProfile(userId: number, profileId: number) {
  if (!ENV.blockingEnabled) throw new Error("Bloqueios ainda não estão habilitados");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .delete(blocks)
    .where(and(eq(blocks.userId, userId), eq(blocks.blockedProfileId, profileId)));
  await writeAuditLog({
    actorUserId: userId,
    action: "profile.unblocked",
    entityType: "profile",
    entityId: profileId,
  });
  return { blocked: false as const };
}

export async function getBlockStatus(userId: number, profileId: number) {
  if (!ENV.blockingEnabled) return { enabled: false as const, blocked: false as const };
  const db = await getDb();
  if (!db) return { enabled: true as const, blocked: false as const };
  const [row] = await db
    .select({ id: blocks.id })
    .from(blocks)
    .where(and(eq(blocks.userId, userId), eq(blocks.blockedProfileId, profileId)))
    .limit(1);
  return { enabled: true as const, blocked: Boolean(row) };
}

export async function listBlockedProfiles(userId: number) {
  if (!ENV.blockingEnabled) return [];
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: blocks.id,
      profileId: blocks.blockedProfileId,
      createdAt: blocks.createdAt,
      stageName: profiles.stageName,
      slug: profiles.slug,
    })
    .from(blocks)
    .leftJoin(profiles, eq(profiles.id, blocks.blockedProfileId))
    .where(eq(blocks.userId, userId))
    .orderBy(desc(blocks.createdAt));
  return rows.filter(row => row.profileId !== null);
}

export async function listUserReports(userId: number) {
  if (!ENV.reportsEnabled) return [];
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: moderationCases.id,
      status: moderationCases.status,
      priority: moderationCases.priority,
      createdAt: moderationCases.createdAt,
    })
    .from(moderationCases)
    .where(
      and(
        eq(moderationCases.targetType, "report"),
        eq(moderationCases.createdBy, userId),
      ),
    )
    .orderBy(desc(moderationCases.createdAt));
}

export async function createProfileReport(
  userId: number,
  input: { profileId: number; category: ReportCategory; description: string }
) {
  if (!ENV.reportsEnabled) throw new Error("Denúncias ainda não estão habilitadas");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const profile = await requirePublicInteractionProfile(db, input.profileId);
  if (!canActOnProfile(userId, profile.ownerId)) throw new Error("Use o suporte administrativo para relatar o próprio perfil");
  const reason = encodeReportReason({
    category: input.category,
    description: input.description,
  });
  const priority = priorityForReport(input.category);
  const [existing] = await db
    .select({ id: moderationCases.id, status: moderationCases.status })
    .from(moderationCases)
    .where(
      and(
        eq(moderationCases.targetType, "report"),
        eq(moderationCases.targetId, input.profileId),
        eq(moderationCases.createdBy, userId),
        or(
          eq(moderationCases.status, "open"),
          eq(moderationCases.status, "in_review"),
          eq(moderationCases.status, "appealed")
        )
      )
    )
    .orderBy(desc(moderationCases.createdAt))
    .limit(1);
  if (existing) return { id: existing.id, status: existing.status, duplicate: true as const };
  const result = await db.insert(moderationCases).values({
    targetType: "report",
    targetId: input.profileId,
    status: "open",
    priority,
    reason,
    createdBy: userId,
  });
  const id = Number(result[0].insertId);
  await writeAuditLog({
    actorUserId: userId,
    action: "report.created",
    entityType: "moderation_case",
    entityId: id,
    metadata: { category: input.category, priority, targetProfileId: input.profileId },
  });
  return { id, status: "open" as const, duplicate: false as const };
}

export async function listAdminReports() {
  if (!ENV.reportsEnabled) return [];
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: moderationCases.id,
      profileId: moderationCases.targetId,
      status: moderationCases.status,
      priority: moderationCases.priority,
      reason: moderationCases.reason,
      assignedTo: moderationCases.assignedTo,
      createdBy: moderationCases.createdBy,
      resolvedAt: moderationCases.resolvedAt,
      createdAt: moderationCases.createdAt,
      updatedAt: moderationCases.updatedAt,
      profileName: profiles.stageName,
      profileSlug: profiles.slug,
    })
    .from(moderationCases)
    .leftJoin(profiles, eq(profiles.id, moderationCases.targetId))
    .where(eq(moderationCases.targetType, "report"))
    .orderBy(
      sql`CASE ${moderationCases.priority} WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END`,
      desc(moderationCases.createdAt)
    )
    .limit(250);
  return rows.map(row => ({ ...row, ...decodeReportReason(row.reason) }));
}

export async function updateAdminReport(input: {
  id: number;
  actorUserId: number;
  status: "open" | "in_review" | "approved" | "rejected" | "appealed" | "closed";
  decision?: string;
}) {
  if (!ENV.reportsEnabled) throw new Error("Denúncias ainda não estão habilitadas");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.transaction(async tx => {
    const [current] = await tx
      .select()
      .from(moderationCases)
      .where(and(eq(moderationCases.id, input.id), eq(moderationCases.targetType, "report")))
      .for("update");
    if (!current) throw new Error("Denúncia não encontrada");
    const terminal = ["approved", "rejected", "closed"].includes(input.status);
    await tx
      .update(moderationCases)
      .set({
        status: input.status,
        assignedTo: input.status === "open" ? null : (current.assignedTo ?? input.actorUserId),
        resolvedAt: terminal ? new Date() : null,
      })
      .where(eq(moderationCases.id, input.id));
    await tx.insert(auditLogs).values({
      actorUserId: input.actorUserId,
      action: `report.status.${input.status}`,
      entityType: "moderation_case",
      entityId: input.id,
      metadata: JSON.stringify({
        previousStatus: current.status,
        decision: input.decision?.trim() || null,
      }),
    });
  });
  return { success: true as const };
}

export async function getReportAuditHistory(reportId: number) {
  if (!ENV.reportsEnabled) return [];
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: auditLogs.id,
      actorUserId: auditLogs.actorUserId,
      action: auditLogs.action,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(and(eq(auditLogs.entityType, "moderation_case"), eq(auditLogs.entityId, reportId)))
    .orderBy(asc(auditLogs.createdAt), asc(auditLogs.id));
}

export async function getSafeExternalContact(
  viewerUserId: number,
  profileId: number,
  method: "whatsapp" | "phone" | "telegram"
) {
  if (!ENV.secureContactEnabled) throw new Error("Contato seguro ainda não está habilitado");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const profile = await requirePublicInteractionProfile(db, profileId);
  if (!canActOnProfile(viewerUserId, profile.ownerId)) throw new Error("Use o painel do titular para revisar seus contatos");
  const [block] = await db
    .select({ id: blocks.id })
    .from(blocks)
    .where(
      or(
        and(eq(blocks.userId, viewerUserId), eq(blocks.blockedProfileId, profileId)),
        and(eq(blocks.userId, profile.ownerId), eq(blocks.blockedUserId, viewerUserId))
      )
    )
    .limit(1);
  if (block) throw new Error("Contato indisponível");
  const terms = await readProfileTermsStatus(db, profile);
  if (!terms.current) throw new Error("A autorização de contato do titular não está vigente");

  let href: string | null = null;
  if (method === "whatsapp") {
    href = contactLinks(profile.phone, profile.whatsapp).whatsapp;
  } else if (method === "phone" && profile.phone) {
    href = contactLinks(profile.phone, profile.whatsapp).tel;
  } else if (method === "telegram" && profile.telegram) {
    const username = profile.telegram.trim().replace(/^@/, "");
    if (/^[A-Za-z0-9_]{5,32}$/.test(username)) href = `https://t.me/${username}`;
  }
  if (!href) throw new Error("Este método de contato não está disponível");
  await writeAuditLog({
    actorUserId: viewerUserId,
    action: "contact.external_exit",
    entityType: "profile",
    entityId: profileId,
    metadata: { method },
  });
  await bumpDailyMetric(profile.id, profile.city, "contact_click");
  return { href, method, offPlatform: true as const };
}

export async function ensureCreditWallet(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(creditWallets)
    .values({ userId, balance: 0 })
    .onDuplicateKeyUpdate({ set: { userId } });
}

export async function cleanupExpiredAuthData() {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(authSessions)
    .where(sql`${authSessions.expiresAt} < UTC_TIMESTAMP()`);
  await db
    .delete(emailVerifications)
    .where(sql`${emailVerifications.expiresAt} < UTC_TIMESTAMP()`);
  await db
    .delete(passwordResetTokens)
    .where(sql`${passwordResetTokens.expiresAt} < UTC_TIMESTAMP()`);
}

export async function getMediaById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  const [media] = await db
    .select()
    .from(profileMedia)
    .where(eq(profileMedia.id, id));
  return media;
}
export async function updateOwnedMedia(
  ownerId: number,
  mediaId: number,
  action: "cover" | "hide"
) {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  await db.transaction(async tx => {
    const [media] = await tx
      .select()
      .from(profileMedia)
      .where(eq(profileMedia.id, mediaId))
      .for("update");
    if (!media) throw new Error("Arquivo indisponível");
    const [profile] = await tx
      .select()
      .from(profiles)
      .where(
        and(eq(profiles.id, media.profileId), eq(profiles.ownerId, ownerId))
      )
      .for("update");
    if (!profile) throw new Error("Arquivo não pertence à conta");
    if (action === "cover") {
      if (media.kind !== "photo" || media.status !== "approved")
        throw new Error("A capa precisa ser uma foto aprovada");
      await tx
        .update(profiles)
        .set({ avatarUrl: media.url })
        .where(eq(profiles.id, profile.id));
    } else {
      await tx
        .update(profileMedia)
        .set({ status: "private" })
        .where(eq(profileMedia.id, media.id));
      if (profile.avatarUrl === media.url)
        await tx
          .update(profiles)
          .set({ avatarUrl: null })
          .where(eq(profiles.id, profile.id));
    }
    await tx
      .insert(auditLogs)
      .values({
        actorUserId: ownerId,
        action: `media.${action}`,
        entityType: "media",
        entityId: media.id,
        metadata: "{}",
      });
  });
  return { success: true };
}

export async function updateOwnedMediaMetadata(
  ownerId: number,
  mediaId: number,
  input: { title: string | null; description: string | null },
) {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  await db.transaction(async tx => {
    const [media] = await tx
      .select()
      .from(profileMedia)
      .where(eq(profileMedia.id, mediaId))
      .for("update");
    if (!media) throw new Error("Arquivo indisponível");
    const [profile] = await tx
      .select({ id: profiles.id })
      .from(profiles)
      .where(and(eq(profiles.id, media.profileId), eq(profiles.ownerId, ownerId)))
      .for("update");
    if (!profile) throw new Error("Arquivo não pertence à conta");
    const metadataChanged =
      media.title !== input.title || media.description !== input.description;
    await tx
      .update(profileMedia)
      .set({
        title: input.title,
        description: input.description,
        ...(metadataChanged && media.status === "approved"
          ? { status: "pending" as const }
          : {}),
      })
      .where(eq(profileMedia.id, mediaId));
    await tx.insert(auditLogs).values({
      actorUserId: ownerId,
      action: "media.metadata_updated",
      entityType: "media",
      entityId: mediaId,
      metadata: JSON.stringify({ reviewRequired: metadataChanged && media.status === "approved" }),
    });
  });
  return { success: true };
}

export async function reorderOwnedMedia(
  ownerId: number,
  profileId: number,
  mediaIds: number[],
) {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  if (new Set(mediaIds).size !== mediaIds.length)
    throw new Error("A galeria não pode conter arquivos repetidos");
  await db.transaction(async tx => {
    const [profile] = await tx
      .select({ id: profiles.id })
      .from(profiles)
      .where(and(eq(profiles.id, profileId), eq(profiles.ownerId, ownerId)))
      .for("update");
    if (!profile) throw new Error("Perfil não pertence à conta");
    const rows = await tx
      .select({ id: profileMedia.id })
      .from(profileMedia)
      .where(eq(profileMedia.profileId, profileId))
      .for("update");
    const knownIds = new Set(rows.map(row => row.id));
    if (
      mediaIds.length !== rows.length ||
      mediaIds.some(mediaId => !knownIds.has(mediaId))
    )
      throw new Error("A ordenação precisa incluir todos os arquivos do anúncio");
    for (let sortOrder = 0; sortOrder < mediaIds.length; sortOrder++) {
      const mediaId = mediaIds[sortOrder];
      await tx
        .update(profileMedia)
        .set({ sortOrder })
        .where(and(eq(profileMedia.id, mediaId), eq(profileMedia.profileId, profileId)));
    }
    await tx.insert(auditLogs).values({
      actorUserId: ownerId,
      action: "media.reordered",
      entityType: "profile",
      entityId: profileId,
      metadata: JSON.stringify({ mediaIds }),
    });
  });
  return { success: true };
}


// ---------------------------------------------------------------------------
// Verificação de identidade (fluxo manual, sem provider externo)
// ---------------------------------------------------------------------------

export async function requestIdentityVerification(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const current = await getIdentityVerification(userId);
  const now = new Date();
  if (current?.status === "pending") return current;
  if (
    current?.status === "approved" &&
    !(current.expiresAt && current.expiresAt <= now)
  )
    return current;
  await db
    .insert(identityVerifications)
    .values({ userId, provider: "manual", status: "pending" });
  await writeAuditLog({
    actorUserId: userId,
    action: "identity.requested",
    entityType: "user",
    entityId: userId,
  });
  return getIdentityVerification(userId);
}

export async function listIdentityQueue(
  status: "pending" | "approved" | "rejected" = "pending"
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: identityVerifications.id,
      userId: identityVerifications.userId,
      status: identityVerifications.status,
      provider: identityVerifications.provider,
      reviewReason: identityVerifications.reviewReason,
      approvedAt: identityVerifications.approvedAt,
      expiresAt: identityVerifications.expiresAt,
      createdAt: identityVerifications.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(identityVerifications)
    .innerJoin(users, eq(users.id, identityVerifications.userId))
    .where(eq(identityVerifications.status, status))
    .orderBy(asc(identityVerifications.createdAt))
    .limit(200);
}

export async function reviewIdentityVerification(input: {
  id: number;
  actorUserId: number;
  decision: "approved" | "rejected";
  reason?: string;
  validityDays?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [row] = await db
    .select()
    .from(identityVerifications)
    .where(eq(identityVerifications.id, input.id))
    .limit(1);
  assertIdentityReviewAllowed({
    row,
    actorUserId: input.actorUserId,
    decision: input.decision,
    reason: input.reason,
  });
  const reason = input.reason?.trim() || null;
  const now = new Date();
  const days = identityValidityDays(input.validityDays);
  await db
    .update(identityVerifications)
    .set(
      input.decision === "approved"
        ? {
            status: "approved",
            approvedAt: now,
            expiresAt: new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
            reviewReason: reason,
          }
        : { status: "rejected", reviewReason: reason }
    )
    .where(
      and(
        eq(identityVerifications.id, input.id),
        eq(identityVerifications.status, "pending")
      )
    );
  await writeAuditLog({
    actorUserId: input.actorUserId,
    action:
      input.decision === "approved" ? "identity.approved" : "identity.rejected",
    entityType: "user",
    entityId: row.userId,
    metadata: { verificationId: row.id, provider: "manual" },
  });
  return { id: row.id, status: input.decision };
}

// ---------------------------------------------------------------------------
// Métricas do anunciante (contadores diários agregados, sem IP nem identificador)
// ---------------------------------------------------------------------------

export type ProfileMetric = "profile_view" | "contact_click";

function saoPauloDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// Métricas nunca podem quebrar a jornada principal: falhas são apenas registradas.
export async function bumpDailyMetric(
  profileId: number,
  city: string,
  eventName: ProfileMetric
) {
  try {
    const db = await getDb();
    if (!db) return;
    await db
      .insert(analyticsDaily)
      .values({
        dateKey: saoPauloDateKey(),
        profileId,
        eventName,
        city: city || "",
        total: 1,
      })
      .onDuplicateKeyUpdate({
        set: { total: sql`${analyticsDaily.total} + 1` },
      });
  } catch (error) {
    console.warn("[Analytics] Falha ao registrar métrica:", error);
  }
}

export async function recordPublicProfileView(
  slug: string,
  viewerUserId?: number | null
) {
  const db = await getDb();
  if (!db) return { recorded: false };
  const [row] = await db
    .select({ id: profiles.id, ownerId: profiles.ownerId, city: profiles.city })
    .from(profiles)
    .where(
      and(
        eq(profiles.slug, slug),
        eq(profiles.status, "approved"),
        eq(profiles.isPublished, true),
        eq(profiles.portfolioReviewed, true),
        eq(profiles.isActive, true),
        sql`${profiles.deletedAt} IS NULL`,
        activeProfileOwner(),
        ...(!ENV.allowFakeData
          ? [eq(profiles.isDemo, false), eq(profiles.isTest, false)]
          : [])
      )
    )
    .limit(1);
  if (!row || (viewerUserId && viewerUserId === row.ownerId))
    return { recorded: false };
  await bumpDailyMetric(row.id, row.city, "profile_view");
  return { recorded: true };
}

export async function getOwnerProfileStats(
  ownerId: number,
  profileId: number,
  days = 30
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const owned = await getOwnerProfile(ownerId, profileId);
  if (!owned) throw new Error("Perfil não pertence à conta");
  const span = Math.min(Math.max(Math.floor(days), 1), 90);
  // Busca o dobro do período para comparar com o período imediatamente anterior.
  const since = saoPauloDateKey(new Date(Date.now() - (span * 2 - 1) * 86400000));
  const rows = await db
    .select({
      dateKey: analyticsDaily.dateKey,
      eventName: analyticsDaily.eventName,
      total: analyticsDaily.total,
    })
    .from(analyticsDaily)
    .where(
      and(
        eq(analyticsDaily.profileId, profileId),
        sql`${analyticsDaily.dateKey} >= ${since}`
      )
    )
    .orderBy(asc(analyticsDaily.dateKey));
  const byDay = new Map<string, { date: string; views: number; contactClicks: number }>();
  for (let i = span * 2 - 1; i >= 0; i--) {
    const key = saoPauloDateKey(new Date(Date.now() - i * 86400000));
    byDay.set(key, { date: key, views: 0, contactClicks: 0 });
  }
  for (const row of rows) {
    const entry = byDay.get(row.dateKey);
    if (!entry) continue;
    if (row.eventName === "profile_view") entry.views += row.total;
    if (row.eventName === "contact_click") entry.contactClicks += row.total;
  }
  const all = Array.from(byDay.values());
  const previous = all.slice(0, span);
  const daily = all.slice(span);
  const sum = (list: typeof daily, key: "views" | "contactClicks") =>
    list.reduce((total, d) => total + d[key], 0);
  return {
    days: span,
    totals: { views: sum(daily, "views"), contactClicks: sum(daily, "contactClicks") },
    previousTotals: { views: sum(previous, "views"), contactClicks: sum(previous, "contactClicks") },
    daily,
  };
}


// ---------------------------------------------------------------------------
// MFA (TOTP) — segredo cifrado em repouso, código usado uma única vez
// ---------------------------------------------------------------------------

export async function getUserMfa(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [row] = await db
    .select()
    .from(userMfa)
    .where(eq(userMfa.userId, userId))
    .limit(1);
  return row;
}

export async function startMfaEnrollment(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const current = await getUserMfa(userId);
  if (current?.enabledAt) throw new Error("A verificação em duas etapas já está ativa");
  const secret = generateTotpSecret();
  const secretEnc = encryptSecret(secret, ENV.cookieSecret);
  if (current) {
    await db.update(userMfa).set({ secretEnc, lastStep: 0 }).where(eq(userMfa.userId, userId));
  } else {
    await db.insert(userMfa).values({ userId, secretEnc });
  }
  return secret;
}

async function consumeMfaCode(userId: number, code: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const row = await getUserMfa(userId);
  if (!row) return null;
  const secret = decryptSecret(row.secretEnc, ENV.cookieSecret);
  const step = verifyTotp(secret, code, { lastStep: row.lastStep });
  if (step === null) return null;
  // Atualização condicional: dois logins simultâneos não reutilizam o mesmo código.
  const result = await db
    .update(userMfa)
    .set({ lastStep: step })
    .where(and(eq(userMfa.userId, userId), sql`${userMfa.lastStep} < ${step}`));
  const affected = Number((result as any)[0]?.affectedRows ?? 0);
  return affected > 0 ? { step, row } : null;
}

export async function confirmMfaEnrollment(userId: number, code: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const consumed = await consumeMfaCode(userId, code);
  if (!consumed) throw new Error("Código inválido. Confira o horário do celular e tente de novo");
  await db.update(userMfa).set({ enabledAt: new Date() }).where(eq(userMfa.userId, userId));
  await writeAuditLog({ actorUserId: userId, action: "mfa.enabled", entityType: "user", entityId: userId });
}

export async function verifyLoginMfa(userId: number, code: string) {
  const row = await getUserMfa(userId);
  if (!row?.enabledAt) return true; // sem MFA ativa, nada a verificar
  return Boolean(await consumeMfaCode(userId, code));
}

export async function disableMfa(userId: number, actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(userMfa).where(eq(userMfa.userId, userId));
  await writeAuditLog({ actorUserId, action: "mfa.disabled", entityType: "user", entityId: userId });
}


// ---------------------------------------------------------------------------
// Planos e assinaturas (ativação manual — cobrança automática continua desligada)
// ---------------------------------------------------------------------------

export type PlanInput = {
  id?: number;
  code: string;
  name: string;
  description?: string | null;
  priceCents: number;
  billingPeriod: "none" | "month" | "year";
  durationDays: number;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  benefits: string[];
};

function hydratePlan(row: any) {
  return { ...row, benefits: parseJson(row.benefits) as string[] };
}

export async function listPlans(onlyActive: boolean) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(plans)
    .where(onlyActive ? eq(plans.isActive, true) : undefined)
    .orderBy(asc(plans.sortOrder), asc(plans.priceCents), asc(plans.id));
  return rows.map(hydratePlan);
}

export async function savePlan(input: PlanInput, actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const values = {
    code: input.code,
    name: input.name,
    description: input.description ?? null,
    priceCents: input.priceCents,
    billingPeriod: input.billingPeriod,
    durationDays: input.durationDays,
    isFeatured: input.isFeatured,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
    benefits: JSON.stringify(input.benefits ?? []),
  };
  if (input.id) {
    await db.update(plans).set(values).where(eq(plans.id, input.id));
    await writeAuditLog({ actorUserId, action: "plan.updated", entityType: "plan", entityId: input.id });
    return input.id;
  }
  const [existing] = await db.select({ id: plans.id }).from(plans).where(eq(plans.code, input.code)).limit(1);
  if (existing) throw new Error("Já existe um plano com este código");
  const inserted = await db.insert(plans).values(values);
  const id = Number(inserted[0].insertId);
  await writeAuditLog({ actorUserId, action: "plan.created", entityType: "plan", entityId: id });
  return id;
}

// Pedido do titular: fica "pending" até a equipe confirmar o Pix e ativar.
export async function requestSubscription(userId: number, planId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [plan] = await db.select().from(plans).where(and(eq(plans.id, planId), eq(plans.isActive, true))).limit(1);
  if (!plan) throw new Error("Plano indisponível");
  const [pending] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.planId, planId), eq(subscriptions.status, "pending")))
    .limit(1);
  if (pending) return { id: pending.id, duplicate: true as const };
  const inserted = await db.insert(subscriptions).values({
    userId,
    planId,
    provider: "manual",
    status: "pending",
    source: "owner_request",
  });
  const id = Number(inserted[0].insertId);
  await writeAuditLog({ actorUserId: userId, action: "subscription.requested", entityType: "subscription", entityId: id, metadata: { planId } });
  return { id, duplicate: false as const };
}

export async function activateSubscription(input: {
  subscriptionId?: number;
  userId?: number;
  planId?: number;
  actorUserId: number;
  paidCents?: number;
  note?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  let sub: any;
  if (input.subscriptionId) {
    [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, input.subscriptionId)).limit(1);
    if (!sub) throw new Error("Assinatura não encontrada");
    if (sub.status !== "pending") throw new Error("Só pedidos pendentes podem ser ativados");
  } else {
    if (!input.userId || !input.planId) throw new Error("Informe o titular e o plano");
    const [owner] = await db.select({ id: users.id }).from(users).where(eq(users.id, input.userId)).limit(1);
    if (!owner) throw new Error("Titular não encontrado");
    sub = { id: null, userId: input.userId, planId: input.planId };
  }
  const [plan] = await db.select().from(plans).where(eq(plans.id, sub.planId)).limit(1);
  if (!plan) throw new Error("Plano não encontrado");
  // Renovação soma ao período vigente, em vez de perder dias já pagos.
  const [current] = await db
    .select({ endsAt: sql<Date>`MAX(${subscriptions.currentPeriodEndsAt})` })
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, sub.userId), eq(subscriptions.planId, sub.planId), eq(subscriptions.status, "active")));
  const now = new Date();
  const base = current?.endsAt && new Date(current.endsAt) > now ? new Date(current.endsAt) : now;
  const endsAt = new Date(base.getTime() + plan.durationDays * 86400000);
  let id = sub.id as number | null;
  const values = {
    status: "active" as const,
    currentPeriodEndsAt: endsAt,
    source: "manual_pix",
    note: input.note?.slice(0, 300) ?? null,
    activatedBy: input.actorUserId,
    provider: "manual",
  };
  if (id) {
    await db.update(subscriptions).set(values).where(eq(subscriptions.id, id));
  } else {
    const inserted = await db.insert(subscriptions).values({ userId: sub.userId, planId: sub.planId, ...values });
    id = Number(inserted[0].insertId);
  }
  const paid = Math.max(0, Math.floor(input.paidCents ?? 0));
  if (paid > 0) {
    await db.insert(financeEntries).values({
      requestId: `subscription-${id}`,
      kind: "income",
      description: `Plano ${plan.name} — titular #${sub.userId}`.slice(0, 250),
      amountCents: paid,
      occurredOn: now.toISOString().slice(0, 10),
      createdBy: input.actorUserId,
    });
  }
  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: "subscription.activated",
    entityType: "subscription",
    entityId: id,
    metadata: { planId: plan.id, userId: sub.userId, endsAt: endsAt.toISOString(), paidCents: paid },
  });
  return { id, endsAt };
}

export async function cancelSubscription(subscriptionId: number, actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, subscriptionId)).limit(1);
  if (!sub) throw new Error("Assinatura não encontrada");
  if (!["pending", "active"].includes(sub.status)) throw new Error("Esta assinatura já foi encerrada");
  await db
    .update(subscriptions)
    .set({ status: "cancelled", currentPeriodEndsAt: sub.status === "active" ? new Date() : sub.currentPeriodEndsAt })
    .where(eq(subscriptions.id, subscriptionId));
  await writeAuditLog({ actorUserId, action: "subscription.cancelled", entityType: "subscription", entityId: subscriptionId });
}

export async function listSubscriptionsAdmin(status?: "pending" | "active" | "cancelled" | "expired") {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: subscriptions.id,
      userId: subscriptions.userId,
      userName: users.name,
      userEmail: users.email,
      planId: subscriptions.planId,
      planName: plans.name,
      planPriceCents: plans.priceCents,
      status: subscriptions.status,
      currentPeriodEndsAt: subscriptions.currentPeriodEndsAt,
      source: subscriptions.source,
      note: subscriptions.note,
      createdAt: subscriptions.createdAt,
    })
    .from(subscriptions)
    .innerJoin(users, eq(users.id, subscriptions.userId))
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(status ? eq(subscriptions.status, status) : undefined)
    .orderBy(desc(subscriptions.createdAt))
    .limit(200);
}

export async function listMySubscriptions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: subscriptions.id,
      planName: plans.name,
      isFeatured: plans.isFeatured,
      status: subscriptions.status,
      currentPeriodEndsAt: subscriptions.currentPeriodEndsAt,
      createdAt: subscriptions.createdAt,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(20);
}


// Atualização leve de "disponível agora": não despublica nem reenvia para revisão,
// porque altera só a disponibilidade e não o conteúdo moderado do anúncio.
export async function setOwnerAvailability(
  ownerId: number,
  profileId: number,
  available: boolean,
  hours?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [owned] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(
      and(
        eq(profiles.id, profileId),
        eq(profiles.ownerId, ownerId),
        sql`${profiles.deletedAt} IS NULL`
      )
    )
    .limit(1);
  if (!owned) throw new Error("Perfil não pertence à conta");
  const until =
    available && hours
      ? new Date(Date.now() + Math.min(Math.max(hours, 1), 24) * 3600000)
      : null;
  await db
    .update(profiles)
    .set({ isAvailableNow: available, availableUntil: until })
    .where(and(eq(profiles.id, profileId), eq(profiles.ownerId, ownerId)));
  await writeAuditLog({
    actorUserId: ownerId,
    action: available ? "profile.available_on" : "profile.available_off",
    entityType: "profile",
    entityId: profileId,
    metadata: { until: until?.toISOString() ?? null },
  });
  return { isAvailableNow: available, availableUntil: until };
}


// Contagens operacionais para o painel de prontidão do admin.
export async function getOperationalCounts() {
  const db = await getDb();
  if (!db) return null;
  const one = async (query: any) => Number((await db.execute(query) as any)[0]?.[0]?.total ?? 0);
  return {
    publishedProfiles: await one(
      sql`SELECT COUNT(*) AS total FROM profiles WHERE status='approved' AND isPublished=1 AND portfolioReviewed=1 AND isActive=1 AND deletedAt IS NULL AND isDemo=0 AND isTest=0`
    ),
    pendingProfiles: await one(sql`SELECT COUNT(*) AS total FROM profiles WHERE status='pending' AND deletedAt IS NULL`),
    pendingMedia: await one(sql`SELECT COUNT(*) AS total FROM profile_media WHERE status='pending'`),
    pendingIdentity: await one(sql`SELECT COUNT(*) AS total FROM identity_verifications WHERE status='pending'`),
    openReports: await one(sql`SELECT COUNT(*) AS total FROM moderation_cases WHERE status IN ('open','in_review')`),
    pendingSubscriptions: await one(sql`SELECT COUNT(*) AS total FROM subscriptions WHERE status='pending'`),
    activePlans: await one(sql`SELECT COUNT(*) AS total FROM plans WHERE isActive=1`),
    newMessages: await one(sql`SELECT COUNT(*) AS total FROM contact_messages WHERE status='new'`),
    owners: await one(sql`SELECT COUNT(DISTINCT ownerId) AS total FROM profiles WHERE deletedAt IS NULL`),
  };
}

// Fale conosco: canal de contato dentro da plataforma (sem depender de e-mail).
export const contactTopics = ["support", "privacy", "report", "password", "other"] as const;

export async function createContactMessage(input: {
  name: string;
  replyTo?: string | null;
  topic: (typeof contactTopics)[number];
  message: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const inserted = await db.insert(contactMessages).values({
    name: input.name,
    replyTo: input.replyTo || null,
    topic: input.topic,
    message: input.message,
  });
  return { id: Number((inserted as any)[0].insertId) };
}

export async function listContactMessages(status: "new" | "handled" | "all" = "new") {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(contactMessages);
  const rows =
    status === "all"
      ? await query.orderBy(desc(contactMessages.createdAt)).limit(200)
      : await query
          .where(eq(contactMessages.status, status))
          .orderBy(desc(contactMessages.createdAt))
          .limit(200);
  return rows;
}

export async function markContactMessageHandled(id: number, actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db
    .update(contactMessages)
    .set({ status: "handled", handledBy: actorUserId, handledAt: new Date() })
    .where(eq(contactMessages.id, id));
  await writeAuditLog({
    actorUserId,
    action: "contact.handled",
    entityType: "contact_message",
    entityId: id,
  });
  return { ok: true };
}
