-- CTE PracTrack — upgrade for an existing database bootstrapped from schema.sql
-- before 2026-10-04 (tester-concerns enhancement pass, see ENHANCEMENT_PLAN.md).
-- Run once in Supabase Dashboard > SQL Editor. Safe to re-run.

-- Admin notifications for pending CT registrations.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CT_REGISTRATION_PENDING';

BEGIN;

-- Notifications can link to the screen they're about.
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "href" TEXT;

-- Bookkeeping for the at-risk rule engine's last full run.
CREATE TABLE IF NOT EXISTS "SystemState" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "alertsEvaluatedAt" TIMESTAMP(3),

    CONSTRAINT "SystemState_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "SystemState" ENABLE ROW LEVEL SECURITY;

-- The old unique index covered (intern, shifting, type, status), which made a
-- second RESOLVED alert of the same type impossible. Replace it with a plain
-- index plus a partial unique index that only constrains ACTIVE alerts.
DROP INDEX IF EXISTS "Alert_internId_shiftingId_type_status_key";
CREATE INDEX IF NOT EXISTS "Alert_internId_shiftingId_type_status_idx" ON "Alert"("internId", "shiftingId", "type", "status");

-- Collapse any duplicate ACTIVE alerts (keep the most recent) before adding the constraint.
DELETE FROM "Alert" a
USING "Alert" b
WHERE a."status" = 'ACTIVE' AND b."status" = 'ACTIVE'
  AND a."internId" = b."internId" AND a."shiftingId" = b."shiftingId" AND a."type" = b."type"
  AND (a."raisedAt" < b."raisedAt" OR (a."raisedAt" = b."raisedAt" AND a."id" < b."id"));

CREATE UNIQUE INDEX IF NOT EXISTS "Alert_one_active_per_type" ON "Alert"("internId", "shiftingId", "type") WHERE "status" = 'ACTIVE';

COMMIT;
