-- Add location columns to doctors and patients
ALTER TABLE "public"."doctors"
  ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "address" TEXT;

ALTER TABLE "public"."patients"
  ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;

-- Create enum types used by consultations and notifications
DO $$ BEGIN
  CREATE TYPE "public"."ConsultationType" AS ENUM ('VIDEO', 'PHYSICAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."ConsultationStatus" AS ENUM ('REQUESTED', 'SCHEDULED', 'COMPLETED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."NotificationStatus" AS ENUM ('UNREAD', 'READ');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create consultations table
CREATE TABLE IF NOT EXISTS "public"."consultations" (
  "id" TEXT NOT NULL,
  "consultationType" "public"."ConsultationType" NOT NULL DEFAULT 'PHYSICAL',
  "patientId" TEXT NOT NULL,
  "doctorId" TEXT NOT NULL,
  "status" "public"."ConsultationStatus" NOT NULL DEFAULT 'REQUESTED',
  "symptoms" TEXT NOT NULL,
  "preferredDate" TIMESTAMP(3) NOT NULL,
  "preferredTime" TEXT NOT NULL,
  "finalDate" TIMESTAMP(3),
  "finalTime" TEXT,
  "patientName" TEXT NOT NULL,
  "patientPhone" TEXT NOT NULL,
  "reportFileName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS "public"."notifications" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "consultationId" TEXT,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" "public"."NotificationStatus" NOT NULL DEFAULT 'UNREAD',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "consultations_patientId_idx" ON "public"."consultations"("patientId");
CREATE INDEX IF NOT EXISTS "consultations_doctorId_idx" ON "public"."consultations"("doctorId");
CREATE INDEX IF NOT EXISTS "consultations_status_idx" ON "public"."consultations"("status");
CREATE INDEX IF NOT EXISTS "consultations_consultationType_idx" ON "public"."consultations"("consultationType");
CREATE INDEX IF NOT EXISTS "notifications_patientId_idx" ON "public"."notifications"("patientId");
CREATE INDEX IF NOT EXISTS "notifications_status_idx" ON "public"."notifications"("status");
CREATE INDEX IF NOT EXISTS "notifications_createdAt_idx" ON "public"."notifications"("createdAt");

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "public"."consultations"
    ADD CONSTRAINT "consultations_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "public"."consultations"
    ADD CONSTRAINT "consultations_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "public"."notifications"
    ADD CONSTRAINT "notifications_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
