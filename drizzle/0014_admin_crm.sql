CREATE TABLE `crm_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stage` varchar(20) NOT NULL DEFAULT 'novo',
	`tags` text,
	`nextFollowUpAt` timestamp,
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crm_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `crm_profiles_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `crm_profiles_stage_idx` ON `crm_profiles` (`stage`);
--> statement-breakpoint
CREATE INDEX `crm_profiles_followup_idx` ON `crm_profiles` (`nextFollowUpAt`);
--> statement-breakpoint
CREATE TABLE `crm_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`authorId` int,
	`kind` varchar(16) NOT NULL DEFAULT 'nota',
	`body` varchar(2000) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crm_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `crm_notes_user_idx` ON `crm_notes` (`userId`,`createdAt`);
--> statement-breakpoint
CREATE TABLE `verification_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`verificationId` int,
	`kind` varchar(16) NOT NULL,
	`storageKey` text NOT NULL,
	`storageHash` varchar(128) NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`sizeBytes` int NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `verification_documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `verification_documents_hash_unique` UNIQUE(`storageHash`)
);
--> statement-breakpoint
CREATE INDEX `verification_documents_user_idx` ON `verification_documents` (`userId`,`deletedAt`);
