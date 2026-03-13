-- Migration: 20251023_slot_offer
-- Create slot_offers table

CREATE TABLE `slot_offers` (
  `id` VARCHAR(191) NOT NULL PRIMARY KEY,
  `patientFormId` VARCHAR(191) NOT NULL,
  `doctorId` VARCHAR(191) NOT NULL,
  `doctorName` VARCHAR(191) NOT NULL,
  `slots` JSON NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
  `patientConfirmedSlot` JSON NULL,
  `twilioMessageSid` VARCHAR(191) NULL,
  `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `confirmedAt` DATETIME(3) NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT `slot_offers_patientFormId_fkey` FOREIGN KEY (`patientFormId`) REFERENCES `patient_form_submissions`(`id`) ON DELETE CASCADE,
  CONSTRAINT `slot_offers_doctorId_fkey` FOREIGN KEY (`doctorId`) REFERENCES `doctors`(`id`)
);

CREATE INDEX `slot_offers_patientFormId_idx` ON `slot_offers`(`patientFormId`);
CREATE INDEX `slot_offers_status_idx` ON `slot_offers`(`status`);
