-- CTE PracTrack — upgrade for an existing database (office feedback pass, see ENHANCEMENT_PLAN_3.md).
-- Run once in Supabase Dashboard > SQL Editor. Safe to re-run.
-- TAKE A BACKUP FIRST: the supervisor backfill drops "SupervisorProfile"."schoolId".
--
-- Covers: AM/PM attendance + cut-offs, duty weekdays, no-duty days, multi-school supervisors,
-- intern self-registration (sections, email verification, enrollment), session notes and
-- lesson-plan approval, periodic progress reports, account locking.

-- ── Enum values (must run outside the transaction below) ─────────────────
ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'LOCKED';
ALTER TYPE "AttendanceStatus" ADD VALUE IF NOT EXISTS 'NO_DUTY';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SUPERVISOR_REGISTRATION_PENDING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'INTERN_ENROLLMENT_PENDING';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'INTERN_ENROLLMENT_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'INTERN_ENROLLMENT_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LESSON_PLAN_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LESSON_PLAN_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LESSON_PLAN_RETURNED';

BEGIN;

DO $$ BEGIN
    CREATE TYPE "EnrollmentStatus" AS ENUM ('PENDING', 'ENROLLED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "LessonPlanStatus" AS ENUM ('NOT_SUBMITTED', 'SUBMITTED', 'APPROVED', 'RETURNED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── User: email verification + lock ──────────────────────────────────────
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lockedByUserId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lockReason" TEXT;
-- Every account that exists today was created by staff, so its email counts as verified.
UPDATE "User" SET "emailVerifiedAt" = "createdAt" WHERE "emailVerifiedAt" IS NULL;

-- ── AM / PM attendance ───────────────────────────────────────────────────
-- The existing timeIn/timeOut/... columns now hold the AM punch (renamed in the Prisma model via @map).
ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "pmTimeIn" TIMESTAMP(3);
ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "pmTimeOut" TIMESTAMP(3);
ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "pmTimeInLat" DECIMAL(10,7);
ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "pmTimeInLng" DECIMAL(10,7);
ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "pmTimeOutLat" DECIMAL(10,7);
ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "pmTimeOutLng" DECIMAL(10,7);
ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "pmTimeInSource" "AttendancePunchSource";
ALTER TABLE "AttendanceRecord" ADD COLUMN IF NOT EXISTS "pmTimeOutSource" "AttendancePunchSource";

-- "timeInCutoff" = AM time-in cut-off, "timeOutStart" = PM time-out start (original columns, unchanged).
ALTER TABLE "CheckInConfig" ADD COLUMN IF NOT EXISTS "amTimeOutStart" TEXT NOT NULL DEFAULT '12:00';
ALTER TABLE "CheckInConfig" ADD COLUMN IF NOT EXISTS "pmTimeInCutoff" TEXT NOT NULL DEFAULT '13:00';
ALTER TABLE "CheckInConfig" ADD COLUMN IF NOT EXISTS "pmWindowOpensAt" TEXT NOT NULL DEFAULT '12:00';

ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "amTimeOutStart" TEXT;
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "pmTimeInCutoff" TEXT;
ALTER TABLE "School" ADD COLUMN IF NOT EXISTS "pmWindowOpensAt" TEXT;

-- ── Duty weekdays + no-duty days ─────────────────────────────────────────
ALTER TABLE "Shifting" ADD COLUMN IF NOT EXISTS "dutyWeekdays" INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5];

CREATE TABLE IF NOT EXISTS "NonDutyDay" (
    "id" TEXT NOT NULL,
    "shiftingId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "schoolId" TEXT,
    "internId" TEXT,
    "reason" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NonDutyDay_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "NonDutyDay" ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS "NonDutyDay_shiftingId_date_idx" ON "NonDutyDay"("shiftingId", "date");
DO $$ BEGIN
    ALTER TABLE "NonDutyDay" ADD CONSTRAINT "NonDutyDay_shiftingId_fkey" FOREIGN KEY ("shiftingId") REFERENCES "Shifting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "NonDutyDay" ADD CONSTRAINT "NonDutyDay_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "NonDutyDay" ADD CONSTRAINT "NonDutyDay_internId_fkey" FOREIGN KEY ("internId") REFERENCES "InternProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Multi-school supervisors ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SupervisorSchool" (
    "id" TEXT NOT NULL,
    "supervisorProfileId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupervisorSchool_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "SupervisorSchool" ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS "SupervisorSchool_schoolId_key" ON "SupervisorSchool"("schoolId");
CREATE INDEX IF NOT EXISTS "SupervisorSchool_supervisorProfileId_idx" ON "SupervisorSchool"("supervisorProfileId");
DO $$ BEGIN
    ALTER TABLE "SupervisorSchool" ADD CONSTRAINT "SupervisorSchool_supervisorProfileId_fkey" FOREIGN KEY ("supervisorProfileId") REFERENCES "SupervisorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "SupervisorSchool" ADD CONSTRAINT "SupervisorSchool_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Backfill from the old single-school column, then drop it (only if it still exists).
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SupervisorProfile' AND column_name = 'schoolId') THEN
        INSERT INTO "SupervisorSchool" ("id", "supervisorProfileId", "schoolId")
        SELECT 'sup_' || sp."id", sp."id", sp."schoolId"
        FROM "SupervisorProfile" sp
        WHERE sp."schoolId" IS NOT NULL
        ON CONFLICT DO NOTHING;
        ALTER TABLE "SupervisorProfile" DROP COLUMN "schoolId";
    END IF;
END $$;

-- ── Sections + intern enrollment + email verification ────────────────────
CREATE TABLE IF NOT EXISTS "Section" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "course" TEXT NOT NULL,
    "yearLevel" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Section" ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS "Section_name_key" ON "Section"("name");

ALTER TABLE "InternProfile" ALTER COLUMN "schoolNumber" DROP NOT NULL;
ALTER TABLE "InternProfile" ADD COLUMN IF NOT EXISTS "sectionId" TEXT;
ALTER TABLE "InternProfile" ADD COLUMN IF NOT EXISTS "enrollmentStatus" "EnrollmentStatus" NOT NULL DEFAULT 'ENROLLED';
ALTER TABLE "InternProfile" ADD COLUMN IF NOT EXISTS "enrolledAt" TIMESTAMP(3);
ALTER TABLE "InternProfile" ADD COLUMN IF NOT EXISTS "enrolledByUserId" TEXT;
ALTER TABLE "InternProfile" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
CREATE INDEX IF NOT EXISTS "InternProfile_enrollmentStatus_idx" ON "InternProfile"("enrollmentStatus");
DO $$ BEGIN
    ALTER TABLE "InternProfile" ADD CONSTRAINT "InternProfile_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
-- Existing interns were added by staff: already enrolled.
UPDATE "InternProfile" SET "enrolledAt" = NOW() WHERE "enrolledAt" IS NULL AND "enrollmentStatus" = 'ENROLLED';

CREATE TABLE IF NOT EXISTS "EmailVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "EmailVerification" ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS "EmailVerification_userId_idx" ON "EmailVerification"("userId");
DO $$ BEGIN
    ALTER TABLE "EmailVerification" ADD CONSTRAINT "EmailVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Session notes + lesson-plan approval ─────────────────────────────────
ALTER TABLE "TeachingSession" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "TeachingSession" ADD COLUMN IF NOT EXISTS "lessonPlanDueDate" DATE;
ALTER TABLE "TeachingSession" ADD COLUMN IF NOT EXISTS "lessonPlanStatus" "LessonPlanStatus" NOT NULL DEFAULT 'NOT_SUBMITTED';
ALTER TABLE "TeachingSession" ADD COLUMN IF NOT EXISTS "lessonPlanApprovedAt" TIMESTAMP(3);
ALTER TABLE "TeachingSession" ADD COLUMN IF NOT EXISTS "lessonPlanApprovedByUserId" TEXT;
ALTER TABLE "TeachingSession" ADD COLUMN IF NOT EXISTS "lessonPlanReturnNote" TEXT;

-- Backfill (only rows still at the default): evaluated sessions count as approved so history is not
-- contradicted; open sessions with a current lesson plan are "submitted"; the rest stay "not submitted".
UPDATE "TeachingSession" ts SET "lessonPlanStatus" = 'APPROVED', "lessonPlanApprovedAt" = COALESCE(ts."lessonPlanApprovedAt", NOW())
WHERE ts."lessonPlanStatus" = 'NOT_SUBMITTED' AND ts."status" = 'EVALUATED';
UPDATE "TeachingSession" ts SET "lessonPlanStatus" = 'SUBMITTED'
WHERE ts."lessonPlanStatus" = 'NOT_SUBMITTED'
  AND EXISTS (SELECT 1 FROM "SessionDocument" d WHERE d."sessionId" = ts."id" AND d."type" = 'LESSON_PLAN' AND d."supersededByDocumentId" IS NULL);

-- ── Periodic progress reports ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ProgressReportPeriod" (
    "id" TEXT NOT NULL,
    "shiftingId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,

    CONSTRAINT "ProgressReportPeriod_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ProgressReportPeriod" ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS "ProgressReportPeriod_shiftingId_idx" ON "ProgressReportPeriod"("shiftingId");
DO $$ BEGIN
    ALTER TABLE "ProgressReportPeriod" ADD CONSTRAINT "ProgressReportPeriod_shiftingId_fkey" FOREIGN KEY ("shiftingId") REFERENCES "Shifting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ProgressReportSubmission" (
    "id" TEXT NOT NULL,
    "internId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressReportSubmission_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ProgressReportSubmission" ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX IF NOT EXISTS "ProgressReportSubmission_internId_periodId_key" ON "ProgressReportSubmission"("internId", "periodId");
CREATE INDEX IF NOT EXISTS "ProgressReportSubmission_periodId_idx" ON "ProgressReportSubmission"("periodId");
DO $$ BEGIN
    ALTER TABLE "ProgressReportSubmission" ADD CONSTRAINT "ProgressReportSubmission_internId_fkey" FOREIGN KEY ("internId") REFERENCES "InternProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "ProgressReportSubmission" ADD CONSTRAINT "ProgressReportSubmission_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "ProgressReportPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
