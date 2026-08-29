import {
  boolean,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    openId: varchar("openId", { length: 128 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    passwordHash: varchar("passwordHash", { length: 255 }),
    emailVerifiedAt: timestamp("emailVerifiedAt"),
    mustChangePassword: boolean("mustChangePassword").default(false).notNull(),
    role: mysqlEnum("role", ["user", "admin", "super_admin", "dev"])
      .default("user")
      .notNull(),
    accountStatus: mysqlEnum("accountStatus", ["active", "suspended"])
      .default("active")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  },
  table => ({
    emailIdx: uniqueIndex("users_email_unique").on(table.email),
    roleIdx: index("users_role_idx").on(table.role),
    statusIdx: index("users_status_idx").on(table.accountStatus),
  }),
);

export const authSessions = mysqlTable(
  "auth_sessions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    revokedAt: timestamp("revokedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  },
  table => ({
    tokenIdx: uniqueIndex("auth_sessions_token_unique").on(table.tokenHash),
    userIdx: index("auth_sessions_user_idx").on(table.userId),
    expiryIdx: index("auth_sessions_expiry_idx").on(table.expiresAt),
  }),
);

export const emailVerifications = mysqlTable(
  "email_verifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    verifiedAt: timestamp("verifiedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    tokenIdx: uniqueIndex("email_verifications_token_unique").on(table.tokenHash),
    userIdx: index("email_verifications_user_idx").on(table.userId),
  }),
);

export const passwordResetTokens = mysqlTable(
  "password_reset_tokens",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    tokenHash: varchar("tokenHash", { length: 128 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    usedAt: timestamp("usedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    tokenIdx: uniqueIndex("password_reset_tokens_token_unique").on(table.tokenHash),
    userIdx: index("password_reset_tokens_user_idx").on(table.userId),
  }),
);

export const ageVerifications = mysqlTable(
  "age_verifications",
  {
    id: int("id").autoincrement().primaryKey(),
    sessionTokenHash: varchar("sessionTokenHash", { length: 128 }).notNull(),
    provider: varchar("provider", { length: 80 }),
    providerReference: varchar("providerReference", { length: 160 }),
    status: mysqlEnum("status", ["pending", "approved", "rejected", "expired", "error"])
      .default("pending")
      .notNull(),
    verifiedAt: timestamp("verifiedAt"),
    expiresAt: timestamp("expiresAt"),
    jurisdiction: varchar("jurisdiction", { length: 80 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    sessionIdx: uniqueIndex("age_verifications_session_unique").on(table.sessionTokenHash),
    providerIdx: index("age_verifications_provider_idx").on(table.providerReference),
    statusIdx: index("age_verifications_status_idx").on(table.status),
  }),
);

export const identityVerifications = mysqlTable(
  "identity_verifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    provider: varchar("provider", { length: 80 }),
    providerReference: varchar("providerReference", { length: 160 }),
    status: mysqlEnum("status", ["pending", "approved", "rejected", "expired", "error"])
      .default("pending")
      .notNull(),
    reviewReason: varchar("reviewReason", { length: 500 }),
    approvedAt: timestamp("approvedAt"),
    expiresAt: timestamp("expiresAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    userIdx: index("identity_verifications_user_idx").on(table.userId),
    providerIdx: index("identity_verifications_provider_idx").on(table.providerReference),
    statusIdx: index("identity_verifications_status_idx").on(table.status),
  }),
);

export const verificationEvents = mysqlTable(
  "verification_events",
  {
    id: int("id").autoincrement().primaryKey(),
    ageVerificationId: int("ageVerificationId"),
    identityVerificationId: int("identityVerificationId"),
    eventType: varchar("eventType", { length: 80 }).notNull(),
    status: varchar("status", { length: 40 }).notNull(),
    providerEventId: varchar("providerEventId", { length: 160 }),
    metadata: text("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    ageIdx: index("verification_events_age_idx").on(table.ageVerificationId),
    identityIdx: index("verification_events_identity_idx").on(table.identityVerificationId),
    eventIdx: uniqueIndex("verification_events_provider_event_unique").on(table.providerEventId),
  }),
);

export const profiles = mysqlTable(
  "profiles",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    slug: varchar("slug", { length: 160 }).notNull().unique(),
    stageName: varchar("stageName", { length: 120 }).notNull(),
    age: int("age"),
    description: text("description"),
    city: varchar("city", { length: 120 }).notNull(),
    region: varchar("region", { length: 80 }),
    locationNote: varchar("locationNote", { length: 180 }),
    categories: text("categories"),
    attributes: text("attributes"),
    contactOptions: text("contactOptions"),
    preferences: text("preferences"),
    languages: text("languages"),
    availabilityLabel: varchar("availabilityLabel", { length: 160 }),
    isAvailableNow: boolean("isAvailableNow").default(false).notNull(),
    phone: varchar("phone", { length: 40 }),
    whatsapp: varchar("whatsapp", { length: 40 }),
    telegram: varchar("telegram", { length: 80 }),
    avatarUrl: text("avatarUrl"),
    status: mysqlEnum("status", ["draft", "pending", "approved", "rejected", "suspended"])
      .default("draft")
      .notNull(),
    isFeatured: boolean("isFeatured").default(false).notNull(),
    isPublished: boolean("isPublished").default(false).notNull(),
    isTest: boolean("isTest").default(false).notNull(),
    isDemo: boolean("isDemo").default(false).notNull(),
    rejectionReason: varchar("rejectionReason", { length: 500 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    ownerIdx: index("profiles_owner_idx").on(table.ownerId),
    cityIdx: index("profiles_city_idx").on(table.city),
    statusIdx: index("profiles_status_idx").on(table.status),
  }),
);

export const profileMedia = mysqlTable(
  "profile_media",
  {
    id: int("id").autoincrement().primaryKey(),
    profileId: int("profileId").notNull(),
    kind: mysqlEnum("kind", ["photo", "video"]).notNull(),
    title: varchar("title", { length: 160 }),
    description: text("description"),
    storageKey: text("storageKey").notNull(),
    storageHash: varchar("storageHash", { length: 128 }).notNull(),
    url: text("url").notNull(),
    mimeType: varchar("mimeType", { length: 120 }).notNull(),
    isPremium: boolean("isPremium").default(false).notNull(),
    status: mysqlEnum("status", ["pending", "approved", "rejected", "private"])
      .default("pending")
      .notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    profileIdx: index("media_profile_idx").on(table.profileId),
    storageIdx: uniqueIndex("media_storage_hash_unique").on(table.storageHash),
    statusIdx: index("media_status_idx").on(table.status),
  }),
);

export const moderationCases = mysqlTable(
  "moderation_cases",
  {
    id: int("id").autoincrement().primaryKey(),
    targetType: mysqlEnum("targetType", ["profile", "media", "user", "report"]).notNull(),
    targetId: int("targetId").notNull(),
    status: mysqlEnum("status", ["open", "in_review", "approved", "rejected", "appealed", "closed"])
      .default("open")
      .notNull(),
    priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"])
      .default("normal")
      .notNull(),
    reason: varchar("reason", { length: 500 }),
    assignedTo: int("assignedTo"),
    createdBy: int("createdBy"),
    resolvedAt: timestamp("resolvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    targetIdx: index("moderation_cases_target_idx").on(table.targetType, table.targetId),
    statusIdx: index("moderation_cases_status_idx").on(table.status),
  }),
);

export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    actorUserId: int("actorUserId"),
    action: varchar("action", { length: 120 }).notNull(),
    entityType: varchar("entityType", { length: 80 }).notNull(),
    entityId: int("entityId"),
    metadata: text("metadata"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    actorIdx: index("audit_logs_actor_idx").on(table.actorUserId),
    entityIdx: index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    createdIdx: index("audit_logs_created_idx").on(table.createdAt),
  }),
);

export const favorites = mysqlTable(
  "favorites",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    profileId: int("profileId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    userProfileIdx: uniqueIndex("favorites_user_profile_unique").on(table.userId, table.profileId),
    profileIdx: index("favorites_profile_idx").on(table.profileId),
  }),
);

export const availability = mysqlTable(
  "availability",
  {
    id: int("id").autoincrement().primaryKey(),
    profileId: int("profileId").notNull(),
    isAvailableNow: boolean("isAvailableNow").default(false).notNull(),
    availableUntil: timestamp("availableUntil"),
    timezone: varchar("timezone", { length: 80 }).default("America/Sao_Paulo").notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    profileIdx: uniqueIndex("availability_profile_unique").on(table.profileId),
    activeIdx: index("availability_active_idx").on(table.isAvailableNow, table.availableUntil),
  }),
);

export const tours = mysqlTable(
  "tours",
  {
    id: int("id").autoincrement().primaryKey(),
    profileId: int("profileId").notNull(),
    city: varchar("city", { length: 120 }).notNull(),
    region: varchar("region", { length: 80 }),
    startsAt: timestamp("startsAt").notNull(),
    endsAt: timestamp("endsAt").notNull(),
    status: mysqlEnum("status", ["planned", "active", "completed", "cancelled"])
      .default("planned")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    profileIdx: index("tours_profile_idx").on(table.profileId),
    cityDateIdx: index("tours_city_date_idx").on(table.city, table.startsAt),
  }),
);

export const plans = mysqlTable(
  "plans",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 40 }).notNull().unique(),
    name: varchar("name", { length: 80 }).notNull(),
    description: text("description"),
    priceCents: int("priceCents").notNull().default(0),
    billingPeriod: mysqlEnum("billingPeriod", ["none", "month", "year"])
      .default("none")
      .notNull(),
    isActive: boolean("isActive").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    activeIdx: index("plans_active_idx").on(table.isActive),
  }),
);

export const subscriptions = mysqlTable(
  "subscriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    planId: int("planId").notNull(),
    provider: varchar("provider", { length: 80 }),
    providerReference: varchar("providerReference", { length: 160 }),
    status: mysqlEnum("status", ["pending", "active", "past_due", "cancelled", "expired"])
      .default("pending")
      .notNull(),
    currentPeriodEndsAt: timestamp("currentPeriodEndsAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    userIdx: index("subscriptions_user_idx").on(table.userId),
    providerIdx: uniqueIndex("subscriptions_provider_unique").on(table.provider, table.providerReference),
  }),
);

export const creditWallets = mysqlTable(
  "credit_wallets",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    balance: int("balance").default(0).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    userIdx: uniqueIndex("credit_wallets_user_unique").on(table.userId),
  }),
);

export const creditLedger = mysqlTable(
  "credit_ledger",
  {
    id: int("id").autoincrement().primaryKey(),
    walletId: int("walletId").notNull(),
    delta: int("delta").notNull(),
    reason: varchar("reason", { length: 160 }).notNull(),
    provider: varchar("provider", { length: 80 }),
    providerReference: varchar("providerReference", { length: 160 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    walletIdx: index("credit_ledger_wallet_idx").on(table.walletId),
    providerIdx: uniqueIndex("credit_ledger_provider_unique").on(table.provider, table.providerReference),
  }),
);

export const analyticsEvents = mysqlTable(
  "analytics_events",
  {
    id: int("id").autoincrement().primaryKey(),
    eventName: varchar("eventName", { length: 80 }).notNull(),
    profileId: int("profileId"),
    anonymousHash: varchar("anonymousHash", { length: 128 }),
    city: varchar("city", { length: 120 }),
    channel: varchar("channel", { length: 80 }),
    metadata: text("metadata"),
    occurredAt: timestamp("occurredAt").defaultNow().notNull(),
  },
  table => ({
    eventIdx: index("analytics_events_name_date_idx").on(table.eventName, table.occurredAt),
    profileIdx: index("analytics_events_profile_date_idx").on(table.profileId, table.occurredAt),
  }),
);

export const analyticsDaily = mysqlTable(
  "analytics_daily",
  {
    id: int("id").autoincrement().primaryKey(),
    dateKey: varchar("dateKey", { length: 10 }).notNull(),
    profileId: int("profileId"),
    eventName: varchar("eventName", { length: 80 }).notNull(),
    city: varchar("city", { length: 120 }),
    total: int("total").default(0).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    aggregationIdx: uniqueIndex("analytics_daily_aggregation_unique").on(table.dateKey, table.profileId, table.eventName, table.city),
  }),
);

export const reviews = mysqlTable(
  "reviews",
  {
    id: int("id").autoincrement().primaryKey(),
    profileId: int("profileId").notNull(),
    authorUserId: int("authorUserId"),
    rating: int("rating").notNull(),
    body: text("body"),
    status: mysqlEnum("status", ["pending", "approved", "rejected", "hidden"])
      .default("pending")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    profileIdx: index("reviews_profile_idx").on(table.profileId),
    statusIdx: index("reviews_status_idx").on(table.status),
  }),
);

export const reviewAppeals = mysqlTable(
  "review_appeals",
  {
    id: int("id").autoincrement().primaryKey(),
    reviewId: int("reviewId").notNull(),
    appellantUserId: int("appellantUserId").notNull(),
    reason: varchar("reason", { length: 500 }).notNull(),
    status: mysqlEnum("status", ["pending", "accepted", "rejected"])
      .default("pending")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    resolvedAt: timestamp("resolvedAt"),
  },
  table => ({
    reviewIdx: index("review_appeals_review_idx").on(table.reviewId),
  }),
);

export const blocks = mysqlTable(
  "blocks",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    blockedProfileId: int("blockedProfileId"),
    blockedUserId: int("blockedUserId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    userProfileIdx: uniqueIndex("blocks_user_profile_unique").on(table.userId, table.blockedProfileId),
    userUserIdx: uniqueIndex("blocks_user_user_unique").on(table.userId, table.blockedUserId),
  }),
);

export const webhookEvents = mysqlTable(
  "webhook_events",
  {
    id: int("id").autoincrement().primaryKey(),
    provider: varchar("provider", { length: 80 }).notNull(),
    providerEventId: varchar("providerEventId", { length: 160 }).notNull(),
    eventType: varchar("eventType", { length: 120 }).notNull(),
    payloadHash: varchar("payloadHash", { length: 128 }).notNull(),
    status: mysqlEnum("status", ["received", "processed", "failed", "ignored"])
      .default("received")
      .notNull(),
    processedAt: timestamp("processedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    providerEventIdx: uniqueIndex("webhook_events_provider_event_unique").on(table.provider, table.providerEventId),
  }),
);

export const premiumEntitlements = mysqlTable(
  "premium_entitlements",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    mediaId: int("mediaId").notNull(),
    provider: varchar("provider", { length: 40 }),
    providerReference: varchar("providerReference", { length: 160 }),
    status: mysqlEnum("status", ["pending", "paid", "revoked"]).default("pending").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    entitlementIdx: uniqueIndex("entitlement_user_media_idx").on(table.userId, table.mediaId),
    providerIdx: uniqueIndex("entitlement_provider_unique").on(table.provider, table.providerReference),
  }),
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;
export type ProfileMedia = typeof profileMedia.$inferSelect;
export type InsertProfileMedia = typeof profileMedia.$inferInsert;
export type AgeVerification = typeof ageVerifications.$inferSelect;
export type IdentityVerification = typeof identityVerifications.$inferSelect;
