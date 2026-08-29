CREATE TABLE `age_verifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionTokenHash` varchar(128) NOT NULL,
	`provider` varchar(80),
	`providerReference` varchar(160),
	`status` enum('pending','approved','rejected','expired','error') NOT NULL DEFAULT 'pending',
	`verifiedAt` timestamp,
	`expiresAt` timestamp,
	`jurisdiction` varchar(80),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `age_verifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `age_verifications_session_unique` UNIQUE(`sessionTokenHash`)
);
--> statement-breakpoint
CREATE TABLE `analytics_daily` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dateKey` varchar(10) NOT NULL,
	`profileId` int,
	`eventName` varchar(80) NOT NULL,
	`city` varchar(120),
	`total` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `analytics_daily_id` PRIMARY KEY(`id`),
	CONSTRAINT `analytics_daily_aggregation_unique` UNIQUE(`dateKey`,`profileId`,`eventName`,`city`)
);
--> statement-breakpoint
CREATE TABLE `analytics_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventName` varchar(80) NOT NULL,
	`profileId` int,
	`anonymousHash` varchar(128),
	`city` varchar(120),
	`channel` varchar(80),
	`metadata` text,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int,
	`action` varchar(120) NOT NULL,
	`entityType` varchar(80) NOT NULL,
	`entityId` int,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auth_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_sessions_token_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `availability` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`isAvailableNow` boolean NOT NULL DEFAULT false,
	`availableUntil` timestamp,
	`timezone` varchar(80) NOT NULL DEFAULT 'America/Sao_Paulo',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `availability_id` PRIMARY KEY(`id`),
	CONSTRAINT `availability_profile_unique` UNIQUE(`profileId`)
);
--> statement-breakpoint
CREATE TABLE `blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`blockedProfileId` int,
	`blockedUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blocks_id` PRIMARY KEY(`id`),
	CONSTRAINT `blocks_user_profile_unique` UNIQUE(`userId`,`blockedProfileId`),
	CONSTRAINT `blocks_user_user_unique` UNIQUE(`userId`,`blockedUserId`)
);
--> statement-breakpoint
CREATE TABLE `credit_ledger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`walletId` int NOT NULL,
	`delta` int NOT NULL,
	`reason` varchar(160) NOT NULL,
	`provider` varchar(80),
	`providerReference` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `credit_ledger_id` PRIMARY KEY(`id`),
	CONSTRAINT `credit_ledger_provider_unique` UNIQUE(`provider`,`providerReference`)
);
--> statement-breakpoint
CREATE TABLE `credit_wallets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`balance` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `credit_wallets_id` PRIMARY KEY(`id`),
	CONSTRAINT `credit_wallets_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `email_verifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_verifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_verifications_token_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`profileId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorites_id` PRIMARY KEY(`id`),
	CONSTRAINT `favorites_user_profile_unique` UNIQUE(`userId`,`profileId`)
);
--> statement-breakpoint
CREATE TABLE `identity_verifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` varchar(80),
	`providerReference` varchar(160),
	`status` enum('pending','approved','rejected','expired','error') NOT NULL DEFAULT 'pending',
	`reviewReason` varchar(500),
	`approvedAt` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `identity_verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `moderation_cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`targetType` enum('profile','media','user','report') NOT NULL,
	`targetId` int NOT NULL,
	`status` enum('open','in_review','approved','rejected','appealed','closed') NOT NULL DEFAULT 'open',
	`priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
	`reason` varchar(500),
	`assignedTo` int,
	`createdBy` int,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `moderation_cases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_token_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(40) NOT NULL,
	`name` varchar(80) NOT NULL,
	`description` text,
	`priceCents` int NOT NULL DEFAULT 0,
	`billingPeriod` enum('none','month','year') NOT NULL DEFAULT 'none',
	`isActive` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `plans_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `review_appeals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reviewId` int NOT NULL,
	`appellantUserId` int NOT NULL,
	`reason` varchar(500) NOT NULL,
	`status` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `review_appeals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`authorUserId` int,
	`rating` int NOT NULL,
	`body` text,
	`status` enum('pending','approved','rejected','hidden') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planId` int NOT NULL,
	`provider` varchar(80),
	`providerReference` varchar(160),
	`status` enum('pending','active','past_due','cancelled','expired') NOT NULL DEFAULT 'pending',
	`currentPeriodEndsAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptions_provider_unique` UNIQUE(`provider`,`providerReference`)
);
--> statement-breakpoint
CREATE TABLE `tours` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`city` varchar(120) NOT NULL,
	`region` varchar(80),
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`status` enum('planned','active','completed','cancelled') NOT NULL DEFAULT 'planned',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tours_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `verification_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ageVerificationId` int,
	`identityVerificationId` int,
	`eventType` varchar(80) NOT NULL,
	`status` varchar(40) NOT NULL,
	`providerEventId` varchar(160),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `verification_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `verification_events_provider_event_unique` UNIQUE(`providerEventId`)
);
--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` varchar(80) NOT NULL,
	`providerEventId` varchar(160) NOT NULL,
	`eventType` varchar(120) NOT NULL,
	`payloadHash` varchar(128) NOT NULL,
	`status` enum('received','processed','failed','ignored') NOT NULL DEFAULT 'received',
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhook_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `webhook_events_provider_event_unique` UNIQUE(`provider`,`providerEventId`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','super_admin','dev') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `profile_media` ADD `storageHash` varchar(128);--> statement-breakpoint
UPDATE `profile_media` SET `storageHash` = SHA2(`storageKey`, 256) WHERE `storageHash` IS NULL;--> statement-breakpoint
ALTER TABLE `profile_media` MODIFY COLUMN `storageHash` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `mustChangePassword` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `accountStatus` enum('active','suspended') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `premium_entitlements` ADD CONSTRAINT `entitlement_provider_unique` UNIQUE(`provider`,`providerReference`);--> statement-breakpoint
ALTER TABLE `profile_media` ADD CONSTRAINT `media_storage_hash_unique` UNIQUE(`storageHash`);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);--> statement-breakpoint
CREATE INDEX `age_verifications_provider_idx` ON `age_verifications` (`providerReference`);--> statement-breakpoint
CREATE INDEX `age_verifications_status_idx` ON `age_verifications` (`status`);--> statement-breakpoint
CREATE INDEX `analytics_events_name_date_idx` ON `analytics_events` (`eventName`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `analytics_events_profile_date_idx` ON `analytics_events` (`profileId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `audit_logs_actor_idx` ON `audit_logs` (`actorUserId`);--> statement-breakpoint
CREATE INDEX `audit_logs_entity_idx` ON `audit_logs` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_idx` ON `audit_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `auth_sessions_user_idx` ON `auth_sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `auth_sessions_expiry_idx` ON `auth_sessions` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `availability_active_idx` ON `availability` (`isAvailableNow`,`availableUntil`);--> statement-breakpoint
CREATE INDEX `credit_ledger_wallet_idx` ON `credit_ledger` (`walletId`);--> statement-breakpoint
CREATE INDEX `email_verifications_user_idx` ON `email_verifications` (`userId`);--> statement-breakpoint
CREATE INDEX `favorites_profile_idx` ON `favorites` (`profileId`);--> statement-breakpoint
CREATE INDEX `identity_verifications_user_idx` ON `identity_verifications` (`userId`);--> statement-breakpoint
CREATE INDEX `identity_verifications_provider_idx` ON `identity_verifications` (`providerReference`);--> statement-breakpoint
CREATE INDEX `identity_verifications_status_idx` ON `identity_verifications` (`status`);--> statement-breakpoint
CREATE INDEX `moderation_cases_target_idx` ON `moderation_cases` (`targetType`,`targetId`);--> statement-breakpoint
CREATE INDEX `moderation_cases_status_idx` ON `moderation_cases` (`status`);--> statement-breakpoint
CREATE INDEX `password_reset_tokens_user_idx` ON `password_reset_tokens` (`userId`);--> statement-breakpoint
CREATE INDEX `plans_active_idx` ON `plans` (`isActive`);--> statement-breakpoint
CREATE INDEX `review_appeals_review_idx` ON `review_appeals` (`reviewId`);--> statement-breakpoint
CREATE INDEX `reviews_profile_idx` ON `reviews` (`profileId`);--> statement-breakpoint
CREATE INDEX `reviews_status_idx` ON `reviews` (`status`);--> statement-breakpoint
CREATE INDEX `subscriptions_user_idx` ON `subscriptions` (`userId`);--> statement-breakpoint
CREATE INDEX `tours_profile_idx` ON `tours` (`profileId`);--> statement-breakpoint
CREATE INDEX `tours_city_date_idx` ON `tours` (`city`,`startsAt`);--> statement-breakpoint
CREATE INDEX `verification_events_age_idx` ON `verification_events` (`ageVerificationId`);--> statement-breakpoint
CREATE INDEX `verification_events_identity_idx` ON `verification_events` (`identityVerificationId`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `users_status_idx` ON `users` (`accountStatus`);