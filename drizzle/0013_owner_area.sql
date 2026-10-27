CREATE TABLE `owner_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fullName` varchar(160) NOT NULL,
	`cpfEnc` text NOT NULL,
	`cpfHash` varchar(64) NOT NULL,
	`cpfLast2` varchar(2) NOT NULL,
	`birthDate` varchar(10) NOT NULL,
	`phone` varchar(40),
	`zipCode` varchar(9),
	`city` varchar(120),
	`state` varchar(2),
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `owner_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `owner_accounts_user_unique` UNIQUE(`userId`),
	CONSTRAINT `owner_accounts_cpf_unique` UNIQUE(`cpfHash`)
);
--> statement-breakpoint
CREATE TABLE `owner_media` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`kind` enum('photo','video') NOT NULL,
	`title` varchar(160),
	`storageKey` text NOT NULL,
	`storageHash` varchar(128) NOT NULL,
	`url` text NOT NULL,
	`mimeType` varchar(120) NOT NULL,
	`sizeBytes` int NOT NULL DEFAULT 0,
	`deletedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `owner_media_id` PRIMARY KEY(`id`),
	CONSTRAINT `owner_media_storage_unique` UNIQUE(`storageHash`)
);
--> statement-breakpoint
CREATE INDEX `owner_media_owner_idx` ON `owner_media` (`ownerId`,`deletedAt`);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`subscriptionId` int,
	`planId` int,
	`description` varchar(200) NOT NULL,
	`amountCents` int NOT NULL DEFAULT 0,
	`status` enum('pending','paid','failed','refunded','cancelled') NOT NULL DEFAULT 'pending',
	`method` enum('pix','card','boleto','manual','courtesy') NOT NULL DEFAULT 'manual',
	`provider` varchar(80),
	`providerReference` varchar(160),
	`invoiceNumber` varchar(40),
	`dueAt` timestamp,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_provider_unique` UNIQUE(`provider`,`providerReference`)
);
--> statement-breakpoint
CREATE INDEX `payments_user_idx` ON `payments` (`userId`,`createdAt`);
