import { portfolioCategories } from "../shared/portfolio";
import { createHash } from "node:crypto";
import { and, asc, desc, eq, like, ne, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  ageVerifications,
  authSessions,
  auditLogs,
  creditWallets,
  emailVerifications,
  identityVerifications,
  InsertProfile,
  InsertProfileMedia,
  passwordResetTokens,
  premiumEntitlements,
  profileMedia,
  profiles,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { hashPassword } from "./auth-crypto";

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

const parseJson = (value: string | null | undefined) => {
  try {
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
};
const serialize = (value: unknown) => JSON.stringify(value ?? []);

export function hydrateProfile(row: any) {
  return {
    ...row,
    categories: parseJson(row.categories),
    attributes: parseJson(row.attributes),
    contactOptions: parseJson(row.contactOptions),
    preferences: parseJson(row.preferences),
    languages: parseJson(row.languages),
    demoContactDisabled: !ENV.demoContactsEnabled,
  };
}

export function hydratePublicProfile(row: any) {
  const hydrated = hydrateProfile(row);
  if (!hydrated.isDemo && !hydrated.isTest && hydrated.portfolioReviewed)
    return { ...hydrated, demoContactDisabled: false };
  return {
    ...hydrated,
    phone: null,
    whatsapp: null,
    telegram: null,
    contactOptions: hydrated.isDemo ? ["Contato demonstrativo desativado"] : [],
    demoContactDisabled: true,
  };
}

function activeProfileOwner() {
  return sql`EXISTS (SELECT 1 FROM ${users} WHERE ${users.id} = ${profiles.ownerId} AND ${users.accountStatus} = 'active')`;
}

export async function listPublishedProfiles(input: {
  search?: string;
  city?: string;
  category?: string;
  attribute?: string;
  limit?: number;
  publicAllowed?: boolean;
}) {
  const db = await getDb();
  if (!db || input.publicAllowed === false) return [];
  const conditions: any[] = [
    eq(profiles.status, "approved"),
    eq(profiles.isPublished, true),
    eq(profiles.portfolioReviewed, true),
    activeProfileOwner(),
  ];
  if (!ENV.allowFakeData)
    conditions.push(eq(profiles.isDemo, false), eq(profiles.isTest, false));
  if (input.city) conditions.push(eq(profiles.city, input.city));
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
  const rows = await db
    .select()
    .from(profiles)
    .where(and(...conditions))
    .orderBy(desc(profiles.isFeatured), desc(profiles.updatedAt))
    .limit(Math.min(input.limit ?? 60, 60));
  return rows.map(hydratePublicProfile);
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
  ];
  if (!ENV.allowFakeData)
    profileConditions.push(
      eq(profiles.isDemo, false),
      eq(profiles.isTest, false)
    );
  const rows = await db
    .select()
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
    ne(profiles.id, rows[0].id),
    eq(profiles.city, rows[0].city),
  ];
  if (!ENV.allowFakeData)
    relatedConditions.push(
      eq(profiles.isDemo, false),
      eq(profiles.isTest, false)
    );
  const relatedRows = await db
    .select()
    .from(profiles)
    .where(and(...relatedConditions))
    .orderBy(desc(profiles.isFeatured), desc(profiles.updatedAt))
    .limit(4);
  return {
    profile: hydratePublicProfile(rows[0]),
    media,
    related: relatedRows.map(hydratePublicProfile),
  };
}

export async function getOwnerProfiles(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.ownerId, ownerId))
    .orderBy(desc(profiles.updatedAt));
  return rows.map(hydrateProfile);
}

export async function getOwnerProfile(ownerId: number, id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.id, id), eq(profiles.ownerId, ownerId)))
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
  input: Omit<InsertProfile, "ownerId">,
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
  const values: any = {
    ...input,
    portfolioReviewed: false,
    ownerId,
    locationNote: input.locationNote ?? null,
    categories: serialize(input.categories),
    attributes: serialize(input.attributes),
    contactOptions: serialize(input.contactOptions),
    preferences: serialize(input.preferences),
    languages: serialize(input.languages),
    phone: input.phone ?? null,
    whatsapp: input.whatsapp ?? null,
    telegram: input.telegram ?? null,
  };
  if (id) {
    const [owned] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(and(eq(profiles.id, id), eq(profiles.ownerId, ownerId)))
      .limit(1);
    if (!owned) throw new Error("Perfil não pertence à conta");
    await db
      .update(profiles)
      .set({
        ...values,
        status: submitForReview ? "pending" : "draft",
        isPublished: false,
        rejectionReason: submitForReview ? null : undefined,
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
  input: Omit<InsertProfileMedia, "storageHash"> & { storageHash?: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const identity = await getIdentityVerification(ownerId);
  if (ENV.requireIdentityVerification && identity?.status !== "approved") {
    throw new Error(
      "A verificação de identidade do anunciante é obrigatória antes do upload"
    );
  }
  const owned = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.id, input.profileId), eq(profiles.ownerId, ownerId)))
    .limit(1);
  if (!owned[0]) throw new Error("Profile not owned by user");
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
    actorUserId: ownerId,
    action: "media.created",
    entityType: "media",
    entityId: mediaId,
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

export async function listAdminProfiles() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select()
    .from(profiles)
    .orderBy(desc(profiles.updatedAt))
    .limit(200);
  return rows.map(hydrateProfile);
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
  await db.transaction(async tx => {
    const [profile] = await tx
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .for("update");
    if (!profile) throw new Error("Perfil não encontrado");
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
      const [owner] = await tx
        .select()
        .from(users)
        .where(eq(users.id, profile.ownerId));
      if (!owner || owner.accountStatus !== "active")
        throw new Error("Titular inativo");
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
          throw new Error(
            "O titular precisa de verificação de identidade válida"
          );
      }
    }
    const canPublish =
      status === "approved" && (ENV.testMode || ENV.publicLaunchEnabled);
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
  await db.update(profileMedia).set({ status }).where(eq(profileMedia.id, id));
  await writeAuditLog({
    actorUserId,
    action: `media.moderated.${status}`,
    entityType: "media",
    entityId: id,
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
