import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertProfile, InsertProfileMedia, premiumEntitlements, profileMedia, profiles, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); }
  }
  return _db;
}

export async function upsertUser(user: any): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb(); if (!db) return;
  const values: any = { openId: user.openId, name: user.name ?? null, email: user.email ?? null, loginMethod: user.loginMethod ?? null, lastSignedIn: new Date() };
  const updateSet: any = { name: values.name, email: values.email, loginMethod: values.loginMethod, lastSignedIn: values.lastSignedIn };
  if (user.role) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1); return rows[0];
}

const parseJson = (value: string | null | undefined) => { try { return value ? JSON.parse(value) : []; } catch { return []; } };
const serialize = (value: unknown) => JSON.stringify(value ?? []);

export function hydrateProfile(row: any) {
  return { ...row, categories: parseJson(row.categories), attributes: parseJson(row.attributes), contactOptions: parseJson(row.contactOptions) };
}

export async function listPublishedProfiles(input: { search?: string; city?: string; category?: string; attribute?: string; limit?: number }) {
  const db = await getDb(); if (!db) return [];
  const conditions: any[] = [eq(profiles.status, "approved"), eq(profiles.isPublished, true)];
  if (input.city) conditions.push(eq(profiles.city, input.city));
  if (input.search) conditions.push(or(like(profiles.stageName, `%${input.search}%`), like(profiles.description, `%${input.search}%`)));
  if (input.category) conditions.push(like(profiles.categories, `%${input.category}%`));
  if (input.attribute) conditions.push(like(profiles.attributes, `%${input.attribute}%`));
  const rows = await db.select().from(profiles).where(and(...conditions)).orderBy(desc(profiles.isFeatured), desc(profiles.updatedAt)).limit(input.limit ?? 60);
  return rows.map(hydrateProfile);
}

export async function getPublicProfile(slug: string) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(profiles).where(and(eq(profiles.slug, slug), eq(profiles.status, "approved"), eq(profiles.isPublished, true))).limit(1);
  if (!rows[0]) return null;
  const media = await db.select().from(profileMedia).where(and(eq(profileMedia.profileId, rows[0].id), eq(profileMedia.status, "approved"))).orderBy(asc(profileMedia.sortOrder), desc(profileMedia.createdAt));
  return { profile: hydrateProfile(rows[0]), media };
}

export async function getOwnerProfiles(ownerId: number) {
  const db = await getDb(); if (!db) return [];
  const rows = await db.select().from(profiles).where(eq(profiles.ownerId, ownerId)).orderBy(desc(profiles.updatedAt));
  return rows.map(hydrateProfile);
}

export async function getOwnerProfile(ownerId: number, id: number) {
  const db = await getDb(); if (!db) return null;
  const rows = await db.select().from(profiles).where(and(eq(profiles.id, id), eq(profiles.ownerId, ownerId))).limit(1);
  if (!rows[0]) return null;
  const media = await db.select().from(profileMedia).where(eq(profileMedia.profileId, id)).orderBy(asc(profileMedia.sortOrder), desc(profileMedia.createdAt));
  return { profile: hydrateProfile(rows[0]), media };
}

export async function saveProfile(ownerId: number, input: Omit<InsertProfile, "ownerId">, id?: number, submitForReview = false) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const values: any = { ...input, ownerId, categories: serialize(input.categories), attributes: serialize(input.attributes), contactOptions: serialize(input.contactOptions) };
  if (id) { await db.update(profiles).set({ ...values, status: submitForReview ? "pending" : "draft", isPublished: false }).where(and(eq(profiles.id, id), eq(profiles.ownerId, ownerId))); return id; }
  const inserted = await db.insert(profiles).values({ ...values, status: submitForReview ? "pending" : "draft", isPublished: false }); return Number(inserted[0].insertId);
}

export async function createMedia(ownerId: number, input: InsertProfileMedia) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const owned = await db.select({ id: profiles.id }).from(profiles).where(and(eq(profiles.id, input.profileId), eq(profiles.ownerId, ownerId))).limit(1);
  if (!owned[0]) throw new Error("Profile not owned by user");
  const inserted = await db.insert(profileMedia).values({ ...input, status: "pending" }); return Number(inserted[0].insertId);
}

export async function hasPremiumAccess(userId: number, mediaId: number) {
  const db = await getDb(); if (!db) return false;
  const rows = await db.select({ id: premiumEntitlements.id }).from(premiumEntitlements).where(and(eq(premiumEntitlements.userId, userId), eq(premiumEntitlements.mediaId, mediaId), eq(premiumEntitlements.status, "paid"))).limit(1);
  return Boolean(rows[0]);
}

export async function createPremiumIntent(userId: number, mediaId: number) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  const inserted = await db.insert(premiumEntitlements).values({ userId, mediaId, status: "pending" }).onDuplicateKeyUpdate({ set: { status: "pending" } });
  return { entitlementId: Number(inserted[0].insertId), status: "pending" as const };
}

export async function listPendingProfiles() { const db = await getDb(); if (!db) return []; const rows = await db.select().from(profiles).where(eq(profiles.status, "pending")).orderBy(desc(profiles.updatedAt)); return rows.map(hydrateProfile); }
export async function listPendingMedia() { const db = await getDb(); if (!db) return []; return db.select().from(profileMedia).where(eq(profileMedia.status, "pending")).orderBy(desc(profileMedia.createdAt)); }
export async function moderateProfile(id: number, status: "approved" | "suspended" | "pending", isFeatured?: boolean) { const db = await getDb(); if (!db) throw new Error("Database unavailable"); await db.update(profiles).set({ status, isPublished: status === "approved", isFeatured: isFeatured ?? false }).where(eq(profiles.id, id)); }
export async function moderateMedia(id: number, status: "approved" | "rejected" | "private") { const db = await getDb(); if (!db) throw new Error("Database unavailable"); await db.update(profileMedia).set({ status }).where(eq(profileMedia.id, id)); }
