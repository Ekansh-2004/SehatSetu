-- CreateTable
CREATE TABLE `doctors` (
    `id` VARCHAR(191) NOT NULL,
    `clerkUserId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL DEFAULT 'Not provided',
    `specialty` VARCHAR(191) NOT NULL,
    `experience` INTEGER NOT NULL,
    `rating` DOUBLE NOT NULL,
    `consultationFee` DOUBLE NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `bio` TEXT NOT NULL,
    `education` JSON NOT NULL,
    `languages` JSON NOT NULL,
    `image` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `defaultSessionDuration` INTEGER NOT NULL DEFAULT 30,
    `maxPatientsPerDay` INTEGER NOT NULL DEFAULT 20,
    `advanceBookingDays` INTEGER NOT NULL DEFAULT 30,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `doctors_clerkUserId_key`(`clerkUserId`),
    UNIQUE INDEX `doctors_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `doctor_slots` (
    `id` VARCHAR(191) NOT NULL,
    `doctorId` VARCHAR(191) NOT NULL,
    `timeRanges` VARCHAR(191) NOT NULL DEFAULT '[]',
    `rrule` TEXT NOT NULL,

    INDEX `doctor_slots_doctorId_fkey`(`doctorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `patients` (
    `id` VARCHAR(191) NOT NULL,
    `clerkUserId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `dateOfBirth` DATETIME(3) NOT NULL,
    `gender` VARCHAR(191) NOT NULL,
    `street` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NOT NULL,
    `zipCode` VARCHAR(191) NOT NULL,
    `emergencyContactName` VARCHAR(191) NOT NULL,
    `emergencyContactPhone` VARCHAR(191) NOT NULL,
    `emergencyContactRelationship` VARCHAR(191) NOT NULL,
    `medicalHistory` JSON NOT NULL,
    `allergies` JSON NOT NULL,
    `currentMedications` JSON NOT NULL,
    `insuranceProvider` VARCHAR(191) NULL,
    `insurancePolicyNumber` VARCHAR(191) NULL,
    `insuranceGroupNumber` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'verified',

    UNIQUE INDEX `patients_clerkUserId_key`(`clerkUserId`),
    UNIQUE INDEX `patients_name_email_phone_key`(`name`, `email`, `phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `appointments` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NULL,
    `doctorId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `startTime` VARCHAR(191) NOT NULL,
    `endTime` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'scheduled',
    `type` VARCHAR(191) NOT NULL DEFAULT 'consultation',
    `reason` TEXT NOT NULL,
    `notes` TEXT NULL,
    `symptoms` JSON NOT NULL,
    `diagnosis` TEXT NULL,
    `prescription` TEXT NULL,
    `followUpRequired` BOOLEAN NOT NULL DEFAULT false,
    `followUpDate` DATETIME(3) NULL,
    `paymentStatus` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `paymentAmount` DOUBLE NOT NULL,
    `stripePaymentIntentId` VARCHAR(191) NULL,
    `stripeSessionId` VARCHAR(191) NULL,
    `reminderSent` BOOLEAN NOT NULL DEFAULT false,
    `guestName` VARCHAR(191) NULL,
    `guestEmail` VARCHAR(191) NULL,
    `guestPhone` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `consultationSummaryFileUuid` VARCHAR(191) NULL,
    `mode` VARCHAR(191) NOT NULL DEFAULT 'physical',

    INDEX `appointments_doctorId_fkey`(`doctorId`),
    INDEX `appointments_patientId_fkey`(`patientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `file_metadata` (
    `id` VARCHAR(191) NOT NULL,
    `uuid` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileExtension` VARCHAR(191) NULL,
    `fileSize` INTEGER NULL,
    `mimeType` VARCHAR(191) NULL,
    `s3Key` VARCHAR(191) NOT NULL,
    `s3Bucket` VARCHAR(191) NOT NULL,
    `s3Url` VARCHAR(191) NULL,
    `tenantId` VARCHAR(191) NULL,
    `patientId` VARCHAR(191) NULL,
    `doctorId` VARCHAR(191) NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'other',
    `description` TEXT NULL,
    `isUpdated` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `uploadedBy` VARCHAR(191) NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastAccessedAt` DATETIME(3) NULL,
    `accessCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `file_metadata_uuid_key`(`uuid`),
    INDEX `file_metadata_uuid_idx`(`uuid`),
    INDEX `file_metadata_tenantId_patientId_idx`(`tenantId`, `patientId`),
    INDEX `file_metadata_tenantId_doctorId_idx`(`tenantId`, `doctorId`),
    INDEX `file_metadata_isActive_uploadedAt_idx`(`isActive`, `uploadedAt`),
    INDEX `file_metadata_s3Key_s3Bucket_idx`(`s3Key`, `s3Bucket`),
    INDEX `file_metadata_doctorId_fkey`(`doctorId`),
    INDEX `file_metadata_patientId_fkey`(`patientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admins` (
    `id` VARCHAR(191) NOT NULL,
    `clerkUserId` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'admin',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admins_clerkUserId_key`(`clerkUserId`),
    UNIQUE INDEX `admins_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `session_analytics` (
    `id` VARCHAR(191) NOT NULL,
    `appointmentId` VARCHAR(191) NOT NULL,
    `doctorId` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NULL,
    `sessionStartTime` DATETIME(3) NULL,
    `sessionEndTime` DATETIME(3) NULL,
    `sessionDurationMinutes` INTEGER NULL,
    `deepgramDurationSeconds` INTEGER NOT NULL DEFAULT 0,
    `deepgramStartTime` DATETIME(3) NULL,
    `deepgramEndTime` DATETIME(3) NULL,
    `deepgramUsageMinutes` DOUBLE NULL,
    `openaiSummaryTokens` INTEGER NOT NULL DEFAULT 0,
    `openaiQuestionsTokens` INTEGER NOT NULL DEFAULT 0,
    `openaiEmbeddingTokens` INTEGER NOT NULL DEFAULT 0,
    `openaiTotalTokens` INTEGER NOT NULL DEFAULT 0,
    `openaiSummaryInputTokens` INTEGER NOT NULL DEFAULT 0,
    `openaiSummaryOutputTokens` INTEGER NOT NULL DEFAULT 0,
    `openaiQuestionsInputTokens` INTEGER NOT NULL DEFAULT 0,
    `openaiQuestionsOutputTokens` INTEGER NOT NULL DEFAULT 0,
    `openaiEmbeddingInputTokens` INTEGER NOT NULL DEFAULT 0,
    `pdfGenerated` BOOLEAN NOT NULL DEFAULT false,
    `pdfGenerationTime` DATETIME(3) NULL,
    `pdfEditCount` INTEGER NOT NULL DEFAULT 0,
    `pdfLastEdited` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deepgramBilledHours` DOUBLE NULL,
    `deepgramRequestIds` JSON NULL,

    UNIQUE INDEX `session_analytics_appointmentId_key`(`appointmentId`),
    INDEX `session_analytics_doctorId_idx`(`doctorId`),
    INDEX `session_analytics_patientId_idx`(`patientId`),
    INDEX `session_analytics_createdAt_idx`(`createdAt`),
    INDEX `session_analytics_sessionStartTime_idx`(`sessionStartTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `doctor_slots` ADD CONSTRAINT `doctor_slots_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `doctors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `doctors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `file_metadata` ADD CONSTRAINT `file_metadata_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `doctors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `file_metadata` ADD CONSTRAINT `file_metadata_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session_analytics` ADD CONSTRAINT `session_analytics_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `appointments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session_analytics` ADD CONSTRAINT `session_analytics_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `doctors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session_analytics` ADD CONSTRAINT `session_analytics_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

