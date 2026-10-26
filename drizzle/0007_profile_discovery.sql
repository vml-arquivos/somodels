ALTER TABLE `profiles` ADD `priceFromCents` int;
--> statement-breakpoint
ALTER TABLE `profiles` ADD `services` text;
--> statement-breakpoint
ALTER TABLE `profiles` ADD `attendancePlaces` text;
--> statement-breakpoint
CREATE INDEX `profiles_price_idx` ON `profiles` (`priceFromCents`);
