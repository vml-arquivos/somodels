CREATE TABLE `finance_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` varchar(64) NOT NULL,
	`kind` enum('income','expense') NOT NULL,
	`description` varchar(250) NOT NULL,
	`amountCents` int NOT NULL,
	`occurredOn` varchar(10) NOT NULL,
	`createdBy` int NOT NULL,
	`voidedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `finance_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `finance_entries_requestId_unique` UNIQUE(`requestId`)
);
--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` int NOT NULL,
	`value` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `profiles` ADD `portfolioReviewed` boolean DEFAULT false NOT NULL;