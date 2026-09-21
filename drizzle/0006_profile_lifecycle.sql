ALTER TABLE `profiles` ADD `isActive` boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE `profiles` ADD `deletedAt` timestamp;
--> statement-breakpoint
CREATE INDEX `profiles_lifecycle_idx` ON `profiles` (`isActive`,`deletedAt`);
