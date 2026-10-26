CREATE TABLE `contact_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`replyTo` varchar(200),
	`topic` enum('support','privacy','report','password','other') NOT NULL DEFAULT 'support',
	`message` text NOT NULL,
	`status` enum('new','handled') NOT NULL DEFAULT 'new',
	`handledBy` int,
	`handledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contact_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `contact_messages_status_idx` ON `contact_messages` (`status`,`createdAt`);
