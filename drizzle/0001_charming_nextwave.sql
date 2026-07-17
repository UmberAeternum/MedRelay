CREATE TABLE `conversationHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`conversationId` varchar(100) NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`tokens` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversationHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `healthAnalytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`date` timestamp NOT NULL,
	`averageBloodPressure` varchar(20),
	`averageHeartRate` decimal(5,1),
	`averageTemperature` decimal(5,2),
	`averageBloodSugar` decimal(5,1),
	`averageOxygenSaturation` decimal(5,1),
	`averageWeight` decimal(5,2),
	`metricsCount` int DEFAULT 0,
	`trend` enum('improving','stable','declining'),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `healthAnalytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medicationReminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`prescriptionDetailId` int NOT NULL,
	`medicationName` varchar(255) NOT NULL,
	`reminderTime` varchar(10) NOT NULL,
	`daysOfWeek` json,
	`isActive` boolean DEFAULT true,
	`lastReminderSent` timestamp,
	`reminderCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medicationReminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prescriptionDetails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prescriptionId` int NOT NULL,
	`medicationName` varchar(255) NOT NULL,
	`dosage` varchar(100) NOT NULL,
	`frequency` varchar(100) NOT NULL,
	`duration` varchar(100),
	`instructions` text,
	`sideEffects` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prescriptionDetails_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `telemedicineConsultations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appointmentId` int NOT NULL,
	`patientId` int NOT NULL,
	`doctorId` int NOT NULL,
	`consultationType` enum('video','audio','chat') NOT NULL,
	`scheduledAt` timestamp NOT NULL,
	`startedAt` timestamp,
	`endedAt` timestamp,
	`duration` int,
	`status` enum('scheduled','ongoing','completed','cancelled') DEFAULT 'scheduled',
	`roomId` varchar(255),
	`recordingUrl` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `telemedicineConsultations_id` PRIMARY KEY(`id`)
);
