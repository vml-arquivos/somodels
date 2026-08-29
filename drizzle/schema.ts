import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, index, uniqueIndex } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  stageName: varchar("stageName", { length: 120 }).notNull(),
  description: text("description"),
  city: varchar("city", { length: 120 }).notNull(),
  region: varchar("region", { length: 80 }),
  categories: text("categories"),
  attributes: text("attributes"),
  contactOptions: text("contactOptions"),
  avatarUrl: text("avatarUrl"),
  status: mysqlEnum("status", ["draft", "pending", "approved", "suspended"]).default("draft").notNull(),
  isFeatured: boolean("isFeatured").default(false).notNull(),
  isPublished: boolean("isPublished").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  ownerIdx: index("profiles_owner_idx").on(table.ownerId),
  cityIdx: index("profiles_city_idx").on(table.city),
  statusIdx: index("profiles_status_idx").on(table.status),
}));

export const profileMedia = mysqlTable("profile_media", {
  id: int("id").autoincrement().primaryKey(),
  profileId: int("profileId").notNull(),
  kind: mysqlEnum("kind", ["photo", "video"]).notNull(),
  title: varchar("title", { length: 160 }),
  description: text("description"),
  storageKey: text("storageKey").notNull(),
  url: text("url").notNull(),
  mimeType: varchar("mimeType", { length: 120 }).notNull(),
  isPremium: boolean("isPremium").default(false).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "private"]).default("pending").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  profileIdx: index("media_profile_idx").on(table.profileId),
  statusIdx: index("media_status_idx").on(table.status),
}));

export const premiumEntitlements = mysqlTable("premium_entitlements", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  mediaId: int("mediaId").notNull(),
  provider: varchar("provider", { length: 40 }),
  providerReference: varchar("providerReference", { length: 160 }),
  status: mysqlEnum("status", ["pending", "paid", "revoked"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  entitlementIdx: uniqueIndex("entitlement_user_media_idx").on(table.userId, table.mediaId),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;
export type ProfileMedia = typeof profileMedia.$inferSelect;
export type InsertProfileMedia = typeof profileMedia.$inferInsert;
