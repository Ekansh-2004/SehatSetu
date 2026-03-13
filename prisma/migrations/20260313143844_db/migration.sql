-- CreateTable
CREATE TABLE "public"."doctors" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT 'Not provided',
    "specialty" TEXT NOT NULL,
    "experience" INTEGER NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "consultationFee" DOUBLE PRECISION NOT NULL,
    "location" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "education" JSONB NOT NULL,
    "languages" JSONB NOT NULL,
    "image" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "defaultSessionDuration" INTEGER NOT NULL DEFAULT 30,
    "maxPatientsPerDay" INTEGER NOT NULL DEFAULT 20,
    "advanceBookingDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."doctor_slots" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "timeRanges" TEXT NOT NULL DEFAULT '[]',
    "rrule" TEXT NOT NULL,

    CONSTRAINT "doctor_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patients" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyContactRelationship" TEXT,
    "medicalHistory" JSONB,
    "allergies" JSONB,
    "currentMedications" JSONB,
    "insuranceProvider" TEXT,
    "insurancePolicyNumber" TEXT,
    "insuranceGroupNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'verified',
    "consentToAlerts" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."appointments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "doctorId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "type" TEXT NOT NULL DEFAULT 'consultation',
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "symptoms" JSONB NOT NULL,
    "diagnosis" TEXT,
    "prescription" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpDate" TIMESTAMP(3),
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "paymentAmount" DOUBLE PRECISION NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeSessionId" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "guestPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "consultationSummaryFileUuid" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'physical',

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."file_metadata" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileExtension" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "s3Key" TEXT NOT NULL,
    "s3Bucket" TEXT NOT NULL,
    "s3Url" TEXT,
    "tenantId" TEXT,
    "patientId" TEXT,
    "doctorId" TEXT,
    "category" TEXT NOT NULL DEFAULT 'other',
    "description" TEXT,
    "isUpdated" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."admins" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."staff" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'staff',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."patient_form_submissions" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "staffId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyContactRelationship" TEXT,
    "medicalHistory" JSONB NOT NULL,
    "allergies" JSONB NOT NULL,
    "currentMedications" JSONB NOT NULL,
    "insuranceProvider" TEXT,
    "insurancePolicyNumber" TEXT,
    "insuranceGroupNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "appointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."session_analytics" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "patientId" TEXT,
    "sessionStartTime" TIMESTAMP(3),
    "sessionEndTime" TIMESTAMP(3),
    "sessionDurationMinutes" INTEGER,
    "deepgramDurationSeconds" INTEGER NOT NULL DEFAULT 0,
    "deepgramStartTime" TIMESTAMP(3),
    "deepgramEndTime" TIMESTAMP(3),
    "deepgramUsageMinutes" DOUBLE PRECISION,
    "openaiSummaryTokens" INTEGER NOT NULL DEFAULT 0,
    "openaiQuestionsTokens" INTEGER NOT NULL DEFAULT 0,
    "openaiEmbeddingTokens" INTEGER NOT NULL DEFAULT 0,
    "openaiTotalTokens" INTEGER NOT NULL DEFAULT 0,
    "openaiSummaryInputTokens" INTEGER NOT NULL DEFAULT 0,
    "openaiSummaryOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "openaiQuestionsInputTokens" INTEGER NOT NULL DEFAULT 0,
    "openaiQuestionsOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "openaiEmbeddingInputTokens" INTEGER NOT NULL DEFAULT 0,
    "pdfGenerated" BOOLEAN NOT NULL DEFAULT false,
    "pdfGenerationTime" TIMESTAMP(3),
    "pdfEditCount" INTEGER NOT NULL DEFAULT 0,
    "pdfLastEdited" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deepgramBilledHours" DOUBLE PRECISION,
    "deepgramRequestIds" JSONB,

    CONSTRAINT "session_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."slot_offers" (
    "id" TEXT NOT NULL,
    "patientFormId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "doctorName" TEXT NOT NULL,
    "slots" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "patientConfirmedSlot" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "messageId" TEXT,

    CONSTRAINT "slot_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "doctors_clerkUserId_key" ON "public"."doctors"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_email_key" ON "public"."doctors"("email");

-- CreateIndex
CREATE INDEX "doctor_slots_doctorId_idx" ON "public"."doctor_slots"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "patients_clerkUserId_key" ON "public"."patients"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "patients_email_key" ON "public"."patients"("email");

-- CreateIndex
CREATE UNIQUE INDEX "patients_phone_key" ON "public"."patients"("phone");

-- CreateIndex
CREATE INDEX "appointments_doctorId_idx" ON "public"."appointments"("doctorId");

-- CreateIndex
CREATE INDEX "appointments_patientId_idx" ON "public"."appointments"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "file_metadata_uuid_key" ON "public"."file_metadata"("uuid");

-- CreateIndex
CREATE INDEX "file_metadata_uuid_idx" ON "public"."file_metadata"("uuid");

-- CreateIndex
CREATE INDEX "file_metadata_tenantId_patientId_idx" ON "public"."file_metadata"("tenantId", "patientId");

-- CreateIndex
CREATE INDEX "file_metadata_tenantId_doctorId_idx" ON "public"."file_metadata"("tenantId", "doctorId");

-- CreateIndex
CREATE INDEX "file_metadata_isActive_uploadedAt_idx" ON "public"."file_metadata"("isActive", "uploadedAt");

-- CreateIndex
CREATE INDEX "file_metadata_s3Key_s3Bucket_idx" ON "public"."file_metadata"("s3Key", "s3Bucket");

-- CreateIndex
CREATE INDEX "file_metadata_doctorId_idx" ON "public"."file_metadata"("doctorId");

-- CreateIndex
CREATE INDEX "file_metadata_patientId_idx" ON "public"."file_metadata"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "admins_clerkUserId_key" ON "public"."admins"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "public"."admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "staff_clerkUserId_key" ON "public"."staff"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_email_key" ON "public"."staff"("email");

-- CreateIndex
CREATE INDEX "patient_form_submissions_patientId_idx" ON "public"."patient_form_submissions"("patientId");

-- CreateIndex
CREATE INDEX "patient_form_submissions_staffId_idx" ON "public"."patient_form_submissions"("staffId");

-- CreateIndex
CREATE INDEX "patient_form_submissions_status_idx" ON "public"."patient_form_submissions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "session_analytics_appointmentId_key" ON "public"."session_analytics"("appointmentId");

-- CreateIndex
CREATE INDEX "session_analytics_doctorId_idx" ON "public"."session_analytics"("doctorId");

-- CreateIndex
CREATE INDEX "session_analytics_patientId_idx" ON "public"."session_analytics"("patientId");

-- CreateIndex
CREATE INDEX "session_analytics_createdAt_idx" ON "public"."session_analytics"("createdAt");

-- CreateIndex
CREATE INDEX "session_analytics_sessionStartTime_idx" ON "public"."session_analytics"("sessionStartTime");

-- CreateIndex
CREATE INDEX "slot_offers_patientFormId_idx" ON "public"."slot_offers"("patientFormId");

-- CreateIndex
CREATE INDEX "slot_offers_status_idx" ON "public"."slot_offers"("status");

-- CreateIndex
CREATE INDEX "slot_offers_doctorId_idx" ON "public"."slot_offers"("doctorId");

-- AddForeignKey
ALTER TABLE "public"."doctor_slots" ADD CONSTRAINT "doctor_slots_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointments" ADD CONSTRAINT "appointments_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."file_metadata" ADD CONSTRAINT "file_metadata_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."file_metadata" ADD CONSTRAINT "file_metadata_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_form_submissions" ADD CONSTRAINT "patient_form_submissions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."patient_form_submissions" ADD CONSTRAINT "patient_form_submissions_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "public"."staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."session_analytics" ADD CONSTRAINT "session_analytics_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."session_analytics" ADD CONSTRAINT "session_analytics_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."session_analytics" ADD CONSTRAINT "session_analytics_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."slot_offers" ADD CONSTRAINT "slot_offers_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."slot_offers" ADD CONSTRAINT "slot_offers_patientFormId_fkey" FOREIGN KEY ("patientFormId") REFERENCES "public"."patient_form_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
