ALTER TABLE `profiles` MODIFY COLUMN `status` enum('draft','pending','approved','rejected','suspended') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `profiles` ADD `age` int;--> statement-breakpoint
ALTER TABLE `profiles` ADD `preferences` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `languages` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `availabilityLabel` varchar(160);--> statement-breakpoint
ALTER TABLE `profiles` ADD `isAvailableNow` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `phone` varchar(40);--> statement-breakpoint
ALTER TABLE `profiles` ADD `whatsapp` varchar(40);--> statement-breakpoint
ALTER TABLE `profiles` ADD `telegram` varchar(80);--> statement-breakpoint
ALTER TABLE `profiles` ADD `isTest` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `isDemo` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `rejectionReason` varchar(500);