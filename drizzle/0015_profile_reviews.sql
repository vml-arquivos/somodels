CREATE TABLE `profile_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profileId` int NOT NULL,
	`authorId` int NOT NULL,
	`authorName` varchar(60) NOT NULL,
	`rating` int NOT NULL,
	`kind` varchar(16) NOT NULL DEFAULT 'comentario',
	`title` varchar(80),
	`body` varchar(1000) NOT NULL,
	`status` varchar(12) NOT NULL DEFAULT 'pending',
	`ownerReply` varchar(600),
	`ownerReplyAt` timestamp,
	`ownerFlaggedAt` timestamp,
	`moderationNote` varchar(300),
	`moderatedBy` int,
	`moderatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profile_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `profile_reviews_author_unique` UNIQUE(`profileId`,`authorId`)
);
--> statement-breakpoint
CREATE INDEX `profile_reviews_public_idx` ON `profile_reviews` (`profileId`,`status`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `profile_reviews_status_idx` ON `profile_reviews` (`status`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `profile_reviews_author_idx` ON `profile_reviews` (`authorId`,`createdAt`);
