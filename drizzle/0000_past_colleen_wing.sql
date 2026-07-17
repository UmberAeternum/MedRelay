CREATE TABLE `aiDiagnostics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`symptoms` json,
	`medicalHistory` json,
	`analysis` text,
	`possibleConditions` json,
	`recommendations` json,
	`confidence` decimal(3,2),
	`status` enum('pending','completed','reviewed') DEFAULT 'pending',
	`reviewedByDoctor` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aiDiagnostics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`doctorId` int NOT NULL,
	`appointmentDate` timestamp NOT NULL,
	`duration` int DEFAULT 30,
	`status` enum('scheduled','completed','cancelled','no-show') DEFAULT 'scheduled',
	`consultationType` enum('in-person','video','phone') DEFAULT 'video',
	`notes` text,
	`symptoms` json,
	`diagnosis` text,
	`prescription` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `doctors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`licenseNumber` varchar(100) NOT NULL,
	`specialty` varchar(100) NOT NULL,
	`subSpecialties` json,
	`qualifications` json,
	`experience` int,
	`bio` text,
	`rating` decimal(3,2) DEFAULT '0',
	`totalReviews` int DEFAULT 0,
	`consultationFee` decimal(10,2),
	`isVerified` boolean DEFAULT false,
	`isAvailable` boolean DEFAULT true,
	`availableSlots` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `doctors_id` PRIMARY KEY(`id`),
	CONSTRAINT `doctors_licenseNumber_unique` UNIQUE(`licenseNumber`)
);
--> statement-breakpoint
CREATE TABLE `facilities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('hospital','clinic','diagnostic-center','pharmacy') NOT NULL,
	`address` text,
	`city` varchar(100),
	`state` varchar(100),
	`zipCode` varchar(20),
	`phone` varchar(20),
	`email` varchar(320),
	`website` varchar(255),
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`rating` decimal(3,2) DEFAULT '0',
	`specialties` json,
	`operatingHours` json,
	`isVerified` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `facilities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `healthMetrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`bloodPressure` varchar(20),
	`heartRate` int,
	`temperature` decimal(4,1),
	`bloodSugar` decimal(5,2),
	`oxygenSaturation` int,
	`weight` decimal(5,2),
	`notes` text,
	`recordedAt` timestamp DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `healthMetrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `medicalRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`recordType` enum('lab-report','imaging','prescription','diagnosis','vaccination','surgery'),
	`title` varchar(255) NOT NULL,
	`description` text,
	`fileUrl` text,
	`recordDate` timestamp,
	`doctorId` int,
	`visibility` enum('private','doctors','public') DEFAULT 'doctors',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `medicalRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`dateOfBirth` timestamp,
	`gender` enum('male','female','other'),
	`bloodType` varchar(5),
	`height` decimal(5,2),
	`weight` decimal(5,2),
	`allergies` json,
	`medicalConditions` json,
	`medications` json,
	`emergencyContact` varchar(20),
	`insuranceProvider` varchar(100),
	`insurancePolicyNumber` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prescriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`appointmentId` int,
	`patientId` int NOT NULL,
	`doctorId` int NOT NULL,
	`medications` json,
	`notes` text,
	`issuedDate` timestamp DEFAULT (now()),
	`expiryDate` timestamp,
	`status` enum('active','expired','cancelled') DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prescriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`doctorId` int NOT NULL,
	`patientId` int NOT NULL,
	`appointmentId` int,
	`rating` int NOT NULL,
	`title` varchar(255),
	`comment` text,
	`isAnonymous` boolean DEFAULT false,
	`helpful` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skinAnalysisResults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` int NOT NULL,
	`imageUrl` text,
	`analysisType` varchar(100),
	`conditions` json,
	`recommendations` json,
	`followUpRequired` boolean DEFAULT false,
	`dermatologistReview` text,
	`reviewedByDoctor` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `skinAnalysisResults_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `specialties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`icon` varchar(50),
	`doctorCount` int DEFAULT 0,
	CONSTRAINT `specialties_id` PRIMARY KEY(`id`),
	CONSTRAINT `specialties_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin','doctor','patient') NOT NULL DEFAULT 'patient',
	`phone` varchar(20),
	`avatar` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
