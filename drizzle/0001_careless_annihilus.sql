CREATE TABLE `premium_entitlements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`mediaId` int NOT NULL,
	`provider` varchar(40),
	`providerReference` varchar(160),
	`status` enum('pending','paid','revoked') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `premium_entitlements_id` PRIMARY KEY(`id`),
	CONSTRAINT `entitlement_user_media_idx` UNIQUE(`userId`,`mediaId`)
);
--> statement-breakpoint
CREATE TABLE `profile_media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`kind` enum('photo','video') NOT NULL,
	`title` varchar(160),
	`description` text,
	`storageKey` text NOT NULL,
	`url` text NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`isPremium` boolean NOT NULL DEFAULT false,
	`status` enum('pending','approved','rejected','private') NOT NULL DEFAULT 'pending',
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `profile_media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`slug` varchar(160) NOT NULL,
	`stageName` varchar(120) NOT NULL,
	`description` text,
	`city` varchar(120) NOT NULL,
	`region` varchar(80),
	`categories` text,
	`attributes` text,
	`contactOptions` text,
	`avatarUrl` text,
	`status` enum('draft','pending','approved','suspended') NOT NULL DEFAULT 'draft',
	`isFeatured` boolean NOT NULL DEFAULT false,
	`isPublished` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `profiles_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE INDEX `media_profile_idx` ON `profile_media` (`profileId`);--> statement-breakpoint
CREATE INDEX `media_status_idx` ON `profile_media` (`status`);--> statement-breakpoint
CREATE INDEX `profiles_owner_idx` ON `profiles` (`ownerId`);--> statement-breakpoint
CREATE INDEX `profiles_city_idx` ON `profiles` (`city`);--> statement-breakpoint
CREATE INDEX `profiles_status_idx` ON `profiles` (`status`);