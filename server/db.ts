import { createHash } from "node:crypto";
import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
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
    await db.select({ value: sql<number>`1` }).from(users).limit(1);
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
  const updateSet: any = {
    name: values.name,
    email: values.email,
    loginMethod: values.loginMethod,
    lastSignedIn: values.lastSignedIn,
  };
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
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return rows[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
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
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);
  const openId = `local:${createHash("sha256").update(email).digest("hex").slice(0, 48)}`;
  const existing = (await getUserByEmail(email)) ?? (await getUserByOpenId(openId));
  if (existing) {
    const updates: any = {
      email,
      name: input.name,
      loginMethod: "password",
      role: input.role,
      accountStatus: "active",
    };
    // Bootstrap credentials are only refreshed while the account is still pending
    // its first password rotation. A rotated account must never be reset on restart.
    if (!existing.passwordHash || existing.mustChangePassword) {
      updates.loginMethod = "password";
      updates.passwordHash = passwordHash;
      updates.emailVerifiedAt = new Date();
      updates.mustChangePassword = input.mustChangePassword ?? true;
    }
    await db.update(users).set(updates).where(eq(users.id, existing.id));
    return getUserByEmail(email);
  }
  await db.insert(users).values({
    openId,
    email,
    name: input.name,
    loginMethod: "password",
    passwordHash,
    emailVerifiedAt: new Date(),
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
    .set({ passwordHash: await hashPassword(password), mustChangePassword: false })
    .where(eq(users.id, userId));
}

export async function createAuthSession(userId: number, tokenHash: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const inserted = await db.insert(authSessions).values({ userId, tokenHash, expiresAt });
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
        eq(users.accountStatus, "active"),
      ),
    )
    .limit(1);
  if (!rows[0]) return undefined;
  await db.update(authSessions).set({ lastSeenAt: new Date() }).where(eq(authSessions.id, rows[0].session.id));
  return rows[0].user;
}

export async function revokeAuthSession(tokenHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(authSessions).set({ revokedAt: new Date() }).where(eq(authSessions.tokenHash, tokenHash));
}

export async function revokeAllAuthSessions(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(authSessions).set({ revokedAt: new Date() }).where(and(eq(authSessions.userId, userId), sql`${authSessions.revokedAt} IS NULL`));
}

export async function createAgeVerificationSession(sessionTokenHash: string, options?: { status?: "pending" | "approved"; provider?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const expiresAt = new Date(Date.now() + ENV.ageVerificationTtlHours * 60 * 60 * 1000);
  await db
    .insert(ageVerifications)
    .values({
      sessionTokenHash,
      provider: options?.provider ?? (ENV.ageVerificationProvider || null),
      status: options?.status ?? "pending",
      expiresAt,
      jurisdiction: "BR",
    })
    .onDuplicateKeyUpdate({ set: { status: options?.status ?? "pending", provider: options?.provider ?? (ENV.ageVerificationProvider || null), expiresAt, updatedAt: new Date() } });
  return { status: (options?.status ?? "pending") as "pending" | "approved", expiresAt };
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
        sql`${ageVerifications.expiresAt} > UTC_TIMESTAMP()`,
      ),
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
  };
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
  const conditions: any[] = [eq(profiles.status, "approved"), eq(profiles.isPublished, true)];
  if (input.city) conditions.push(eq(profiles.city, input.city));
  if (input.search) conditions.push(or(like(profiles.stageName, `%${input.search}%`), like(profiles.description, `%${input.search}%`)));
  if (input.category) conditions.push(like(profiles.categories, `%${input.category}%`));
  if (input.attribute) conditions.push(like(profiles.attributes, `%${input.attribute}%`));
  const rows = await db
    .select()
    .from(profiles)
    .where(and(...conditions))
    .orderBy(desc(profiles.isFeatured), desc(profiles.updatedAt))
    .limit(Math.min(input.limit ?? 60, 60));
  return rows.map(hydrateProfile);
}

export async function getPublicProfile(slug: string, publicAllowed = true) {
  const db = await getDb();
  if (!db || !publicAllowed) return null;
  const rows = await db.select().from(profiles).where(and(eq(profiles.slug, slug), eq(profiles.status, "approved"), eq(profiles.isPublished, true))).limit(1);
  if (!rows[0]) return null;
  const media = await db.select().from(profileMedia).where(and(eq(profileMedia.profileId, rows[0].id), eq(profileMedia.status, "approved"))).orderBy(asc(profileMedia.sortOrder), desc(profileMedia.createdAt));
  return { profile: hydrateProfile(rows[0]), media };
}

export async function getOwnerProfiles(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(profiles).where(eq(profiles.ownerId, ownerId)).orderBy(desc(profiles.updatedAt));
  return rows.map(hydrateProfile);
}

export async function getOwnerProfile(ownerId: number, id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(profiles).where(and(eq(profiles.id, id), eq(profiles.ownerId, ownerId))).limit(1);
  if (!rows[0]) return null;
  const media = await db.select().from(profileMedia).where(eq(profileMedia.profileId, id)).orderBy(asc(profileMedia.sortOrder), desc(profileMedia.createdAt));
  return { profile: hydrateProfile(rows[0]), media };
}

export async function saveProfile(ownerId: number, input: Omit<InsertProfile, "ownerId">, id?: number, submitForReview = false) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const identity = await getIdentityVerification(ownerId);
  if (submitForReview && ENV.kycRequired && identity?.status !== "approved") {
    throw new Error("A verificação de identidade do anunciante é obrigatória antes do envio para análise");
  }
  const values: any = {
    ...input,
    ownerId,
    categories: serialize(input.categories),
    attributes: serialize(input.attributes),
    contactOptions: serialize(input.contactOptions),
  };
  if (id) {
    await db.update(profiles).set({ ...values, status: submitForReview ? "pending" : "draft", isPublished: false }).where(and(eq(profiles.id, id), eq(profiles.ownerId, ownerId)));
    await writeAuditLog({ actorUserId: ownerId, action: submitForReview ? "profile.submitted" : "profile.updated", entityType: "profile", entityId: id });
    return id;
  }
  const inserted = await db.insert(profiles).values({ ...values, status: submitForReview ? "pending" : "draft", isPublished: false });
  const profileId = Number(inserted[0].insertId);
  await writeAuditLog({ actorUserId: ownerId, action: submitForReview ? "profile.submitted" : "profile.created", entityType: "profile", entityId: profileId });
  return profileId;
}

export async function createMedia(ownerId: number, input: Omit<InsertProfileMedia, "storageHash"> & { storageHash?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const identity = await getIdentityVerification(ownerId);
  if (ENV.kycRequired && identity?.status !== "approved") {
    throw new Error("A verificação de identidade do anunciante é obrigatória antes do upload");
  }
  const owned = await db.select({ id: profiles.id }).from(profiles).where(and(eq(profiles.id, input.profileId), eq(profiles.ownerId, ownerId))).limit(1);
  if (!owned[0]) throw new Error("Profile not owned by user");
  const storageHash = input.storageHash ?? createHash("sha256").update(input.storageKey).digest("hex");
  const inserted = await db.insert(profileMedia).values({ ...input, storageHash, status: "pending" });
  const mediaId = Number(inserted[0].insertId);
  await writeAuditLog({ actorUserId: ownerId, action: "media.created", entityType: "media", entityId: mediaId });
  return mediaId;
}

export async function hasPremiumAccess(userId: number, mediaId: number) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ id: premiumEntitlements.id }).from(premiumEntitlements).where(and(eq(premiumEntitlements.userId, userId), eq(premiumEntitlements.mediaId, mediaId), eq(premiumEntitlements.status, "paid"))).limit(1);
  return Boolean(rows[0]);
}

export async function createPremiumIntent(userId: number, mediaId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (!ENV.paymentsEnabled || !ENV.paymentProvider || !ENV.paymentApiKey || !ENV.paymentWebhookSecret) {
    throw new Error("Pagamentos estão desativados até a aprovação e configuração de um provedor compatível");
  }
  const inserted = await db.insert(premiumEntitlements).values({ userId, mediaId, status: "pending", provider: ENV.paymentProvider }).onDuplicateKeyUpdate({ set: { status: "pending" } });
  return { entitlementId: Number(inserted[0].insertId), status: "pending" as const };
}

export async function listPendingProfiles() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(profiles).where(eq(profiles.status, "pending")).orderBy(desc(profiles.updatedAt));
  return rows.map(hydrateProfile);
}

export async function listPendingMedia() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(profileMedia).where(eq(profileMedia.status, "pending")).orderBy(desc(profileMedia.createdAt));
}

export async function moderateProfile(id: number, status: "approved" | "suspended" | "pending", isFeatured = false, actorUserId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const profileRows = await db.select({ ownerId: profiles.ownerId }).from(profiles).where(eq(profiles.id, id)).limit(1);
  if (!profileRows[0]) throw new Error("Profile not found");
  if (status === "approved" && ENV.kycRequired) {
    const identity = await getIdentityVerification(profileRows[0].ownerId);
    if (identity?.status !== "approved") throw new Error("O anunciante precisa de verificação de identidade aprovada");
  }
  await db.update(profiles).set({ status, isPublished: status === "approved", isFeatured: status === "approved" && isFeatured }).where(eq(profiles.id, id));
  await writeAuditLog({ actorUserId, action: `profile.moderated.${status}`, entityType: "profile", entityId: id, metadata: { isFeatured } });
}

export async function moderateMedia(id: number, status: "approved" | "rejected" | "private", actorUserId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(profileMedia).set({ status }).where(eq(profileMedia.id, id));
  await writeAuditLog({ actorUserId, action: `media.moderated.${status}`, entityType: "media", entityId: id });
}

export async function getMediaByStorageHash(storageHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(profileMedia).where(eq(profileMedia.storageHash, storageHash)).limit(1);
  return rows[0];
}

export async function getMediaByStorageKey(storageKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(profileMedia).where(eq(profileMedia.storageKey, storageKey)).limit(1);
  return rows[0];
}

export async function ensureCreditWallet(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(creditWallets).values({ userId, balance: 0 }).onDuplicateKeyUpdate({ set: { userId } });
}

export async function cleanupExpiredAuthData() {
  const db = await getDb();
  if (!db) return;
  await db.delete(authSessions).where(sql`${authSessions.expiresAt} < UTC_TIMESTAMP()`);
  await db.delete(emailVerifications).where(sql`${emailVerifications.expiresAt} < UTC_TIMESTAMP()`);
  await db.delete(passwordResetTokens).where(sql`${passwordResetTokens.expiresAt} < UTC_TIMESTAMP()`);
}
