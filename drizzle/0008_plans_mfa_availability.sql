CREATE TABLE `user_mfa` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`secretEnc` text NOT NULL,
	`enabledAt` timestamp,
	`lastStep` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_mfa_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_mfa_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `plans` ADD `isFeatured` boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `plans` ADD `durationDays` int DEFAULT 30 NOT NULL;
--> statement-breakpoint
ALTER TABLE `plans` ADD `sortOrder` int DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `plans` ADD `benefits` text;
--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `source` varchar(40);
--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `note` varchar(300);
--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `activatedBy` int;
--> statement-breakpoint
CREATE INDEX `subscriptions_active_window_idx` ON `subscriptions` (`status`,`currentPeriodEndsAt`);
--> statement-breakpoint
ALTER TABLE `profiles` ADD `availableUntil` timestamp;
