-- Add clinicAddress for physical consultation display while keeping legacy address column.
ALTER TABLE "public"."doctors"
  ADD COLUMN IF NOT EXISTS "clinicAddress" TEXT;

-- Backfill clinicAddress from existing address/location when present.
UPDATE "public"."doctors"
SET "clinicAddress" = COALESCE("clinicAddress", "address", "location")
WHERE "clinicAddress" IS NULL;
