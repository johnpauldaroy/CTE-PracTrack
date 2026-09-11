-- CTE PracTrack - Supabase/PostgreSQL bootstrap
-- Generated from prisma/schema.prisma for a new, empty Supabase project.
-- Run this file once in Supabase Dashboard > SQL Editor.

BEGIN;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SUPERVISOR', 'COOPERATING_TEACHER', 'STUDENT_INTERN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SchoolType" AS ENUM ('SECONDARY', 'ELEMENTARY');

-- CreateEnum
CREATE TYPE "ShiftingName" AS ENUM ('FIRST', 'SECOND');

-- CreateEnum
CREATE TYPE "ShiftingStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'INCOMPLETE', 'LATE', 'EXCUSED');

-- CreateEnum
CREATE TYPE "AttendancePunchSource" AS ENUM ('DEVICE', 'MANUAL_SUPERVISOR');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('REGULAR', 'FINAL_DEMO');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ASSIGNED', 'EVALUATED');

-- CreateEnum
CREATE TYPE "SessionDocumentType" AS ENUM ('LESSON_PLAN', 'PROGRESS_REPORT');

-- CreateEnum
CREATE TYPE "EndOfTermSubmissionType" AS ENUM ('NARRATIVE_REPORT', 'TEACHING_PORTFOLIO');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('ABSENCE_EARLY_WARNING', 'CONSECUTIVE_ABSENCES', 'DROP_ELIGIBLE', 'BEHIND_PACE', 'EVALUATION_PENDING');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'RESOLVED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SESSION_ASSIGNED', 'SESSION_EVALUATED', 'ATTENDANCE_THRESHOLD_WARNING', 'ALERT_RAISED', 'EVALUATION_AWAITING', 'CT_REGISTRATION_APPROVED', 'DOCUMENT_REMINDER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupervisorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "schoolId" TEXT,

    CONSTRAINT "SupervisorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CooperatingTeacherProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "CooperatingTeacherProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolNumber" TEXT NOT NULL,
    "course" TEXT NOT NULL,
    "yearLevel" TEXT NOT NULL,
    "assignedSchoolId" TEXT NOT NULL,
    "cooperatingTeacherId" TEXT,
    "createdByUserId" TEXT NOT NULL,

    CONSTRAINT "InternProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SchoolType" NOT NULL,
    "municipality" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "geofenceRadiusMeters" INTEGER NOT NULL DEFAULT 75,
    "timeInCutoff" TEXT,
    "timeOutStart" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolSupervisorHistory" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "supervisorUserId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),
    "assignedByUserId" TEXT NOT NULL,

    CONSTRAINT "SchoolSupervisorHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Semester" (
    "id" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Semester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shifting" (
    "id" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "name" "ShiftingName" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "requiredTeachingSessions" INTEGER NOT NULL DEFAULT 15,
    "requiredFinalDemos" INTEGER NOT NULL DEFAULT 1,
    "status" "ShiftingStatus" NOT NULL DEFAULT 'UPCOMING',
    "activatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Shifting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "internId" TEXT NOT NULL,
    "shiftingId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "timeIn" TIMESTAMP(3),
    "timeOut" TIMESTAMP(3),
    "timeInLat" DECIMAL(10,7),
    "timeInLng" DECIMAL(10,7),
    "timeOutLat" DECIMAL(10,7),
    "timeOutLng" DECIMAL(10,7),
    "timeInSource" "AttendancePunchSource",
    "timeOutSource" "AttendancePunchSource",
    "status" "AttendanceStatus" NOT NULL,
    "excuseReason" TEXT,
    "excusedByUserId" TEXT,
    "excusedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeachingSession" (
    "id" TEXT NOT NULL,
    "internId" TEXT NOT NULL,
    "shiftingId" TEXT NOT NULL,
    "cooperatingTeacherId" TEXT NOT NULL,
    "sessionNumber" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "subject" TEXT NOT NULL,
    "gradeSection" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "type" "SessionType" NOT NULL DEFAULT 'REGULAR',
    "status" "SessionStatus" NOT NULL DEFAULT 'ASSIGNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeachingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationCriterion" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "weightPercent" DECIMAL(5,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EvaluationCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationItem" (
    "id" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EvaluationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overallScore" DECIMAL(5,2) NOT NULL,
    "commendable" TEXT,
    "areasForImprovement" TEXT,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationItemScore" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,

    CONSTRAINT "EvaluationItemScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionDocument" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" "SessionDocumentType" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededByDocumentId" TEXT,

    CONSTRAINT "SessionDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EndOfTermSubmission" (
    "id" TEXT NOT NULL,
    "internId" TEXT NOT NULL,
    "shiftingId" TEXT NOT NULL,
    "type" "EndOfTermSubmissionType" NOT NULL,
    "dueDate" DATE NOT NULL,
    "storageKey" TEXT,
    "originalFilename" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "uploadedAt" TIMESTAMP(3),

    CONSTRAINT "EndOfTermSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "internId" TEXT NOT NULL,
    "shiftingId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "detail" TEXT NOT NULL,
    "raisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlaggingRuleConfig" (
    "id" TEXT NOT NULL,
    "absenceEarlyWarning" INTEGER NOT NULL DEFAULT 3,
    "consecutiveAbsences" INTEGER NOT NULL DEFAULT 3,
    "dropEligibleAbove" INTEGER NOT NULL DEFAULT 12,
    "evaluationPendingDays" INTEGER NOT NULL DEFAULT 7,
    "behindPaceTolerance" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlaggingRuleConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckInConfig" (
    "id" TEXT NOT NULL,
    "timeInCutoff" TEXT NOT NULL DEFAULT '07:30',
    "timeOutStart" TEXT NOT NULL DEFAULT '15:00',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckInConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorRole" "Role" NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "diff" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SupervisorProfile_userId_key" ON "SupervisorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SupervisorProfile_schoolId_key" ON "SupervisorProfile"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "CooperatingTeacherProfile_userId_key" ON "CooperatingTeacherProfile"("userId");

-- CreateIndex
CREATE INDEX "CooperatingTeacherProfile_schoolId_idx" ON "CooperatingTeacherProfile"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "InternProfile_userId_key" ON "InternProfile"("userId");

-- CreateIndex
CREATE INDEX "InternProfile_assignedSchoolId_idx" ON "InternProfile"("assignedSchoolId");

-- CreateIndex
CREATE INDEX "InternProfile_cooperatingTeacherId_idx" ON "InternProfile"("cooperatingTeacherId");

-- CreateIndex
CREATE UNIQUE INDEX "InternProfile_assignedSchoolId_schoolNumber_key" ON "InternProfile"("assignedSchoolId", "schoolNumber");

-- CreateIndex
CREATE INDEX "School_type_idx" ON "School"("type");

-- CreateIndex
CREATE INDEX "SchoolSupervisorHistory_schoolId_idx" ON "SchoolSupervisorHistory"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_label_key" ON "AcademicYear"("label");

-- CreateIndex
CREATE INDEX "Semester_academicYearId_idx" ON "Semester"("academicYearId");

-- CreateIndex
CREATE INDEX "Shifting_status_idx" ON "Shifting"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Shifting_semesterId_name_key" ON "Shifting"("semesterId", "name");

-- CreateIndex
CREATE INDEX "AttendanceRecord_shiftingId_idx" ON "AttendanceRecord"("shiftingId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_internId_shiftingId_idx" ON "AttendanceRecord"("internId", "shiftingId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_internId_date_key" ON "AttendanceRecord"("internId", "date");

-- CreateIndex
CREATE INDEX "TeachingSession_shiftingId_idx" ON "TeachingSession"("shiftingId");

-- CreateIndex
CREATE INDEX "TeachingSession_cooperatingTeacherId_idx" ON "TeachingSession"("cooperatingTeacherId");

-- CreateIndex
CREATE INDEX "TeachingSession_internId_shiftingId_idx" ON "TeachingSession"("internId", "shiftingId");

-- CreateIndex
CREATE UNIQUE INDEX "TeachingSession_internId_shiftingId_sessionNumber_key" ON "TeachingSession"("internId", "shiftingId", "sessionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationCriterion_order_key" ON "EvaluationCriterion"("order");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationItem_criterionId_order_key" ON "EvaluationItem"("criterionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_sessionId_key" ON "Evaluation"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationItemScore_evaluationId_itemId_key" ON "EvaluationItemScore"("evaluationId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionDocument_supersededByDocumentId_key" ON "SessionDocument"("supersededByDocumentId");

-- CreateIndex
CREATE INDEX "SessionDocument_sessionId_type_idx" ON "SessionDocument"("sessionId", "type");

-- CreateIndex
CREATE INDEX "EndOfTermSubmission_shiftingId_idx" ON "EndOfTermSubmission"("shiftingId");

-- CreateIndex
CREATE UNIQUE INDEX "EndOfTermSubmission_internId_shiftingId_type_key" ON "EndOfTermSubmission"("internId", "shiftingId", "type");

-- CreateIndex
CREATE INDEX "Alert_shiftingId_status_idx" ON "Alert"("shiftingId", "status");

-- CreateIndex
CREATE INDEX "Alert_internId_shiftingId_idx" ON "Alert"("internId", "shiftingId");

-- CreateIndex
CREATE UNIQUE INDEX "Alert_internId_shiftingId_type_status_key" ON "Alert"("internId", "shiftingId", "type", "status");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "SupervisorProfile" ADD CONSTRAINT "SupervisorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisorProfile" ADD CONSTRAINT "SupervisorProfile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CooperatingTeacherProfile" ADD CONSTRAINT "CooperatingTeacherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CooperatingTeacherProfile" ADD CONSTRAINT "CooperatingTeacherProfile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CooperatingTeacherProfile" ADD CONSTRAINT "CooperatingTeacherProfile_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternProfile" ADD CONSTRAINT "InternProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternProfile" ADD CONSTRAINT "InternProfile_assignedSchoolId_fkey" FOREIGN KEY ("assignedSchoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternProfile" ADD CONSTRAINT "InternProfile_cooperatingTeacherId_fkey" FOREIGN KEY ("cooperatingTeacherId") REFERENCES "CooperatingTeacherProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternProfile" ADD CONSTRAINT "InternProfile_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolSupervisorHistory" ADD CONSTRAINT "SchoolSupervisorHistory_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolSupervisorHistory" ADD CONSTRAINT "SchoolSupervisorHistory_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Semester" ADD CONSTRAINT "Semester_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shifting" ADD CONSTRAINT "Shifting_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_internId_fkey" FOREIGN KEY ("internId") REFERENCES "InternProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_shiftingId_fkey" FOREIGN KEY ("shiftingId") REFERENCES "Shifting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_excusedByUserId_fkey" FOREIGN KEY ("excusedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingSession" ADD CONSTRAINT "TeachingSession_internId_fkey" FOREIGN KEY ("internId") REFERENCES "InternProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingSession" ADD CONSTRAINT "TeachingSession_shiftingId_fkey" FOREIGN KEY ("shiftingId") REFERENCES "Shifting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingSession" ADD CONSTRAINT "TeachingSession_cooperatingTeacherId_fkey" FOREIGN KEY ("cooperatingTeacherId") REFERENCES "CooperatingTeacherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationItem" ADD CONSTRAINT "EvaluationItem_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "EvaluationCriterion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TeachingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationItemScore" ADD CONSTRAINT "EvaluationItemScore_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationItemScore" ADD CONSTRAINT "EvaluationItemScore_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "EvaluationItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionDocument" ADD CONSTRAINT "SessionDocument_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TeachingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionDocument" ADD CONSTRAINT "SessionDocument_supersededByDocumentId_fkey" FOREIGN KEY ("supersededByDocumentId") REFERENCES "SessionDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EndOfTermSubmission" ADD CONSTRAINT "EndOfTermSubmission_internId_fkey" FOREIGN KEY ("internId") REFERENCES "InternProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EndOfTermSubmission" ADD CONSTRAINT "EndOfTermSubmission_shiftingId_fkey" FOREIGN KEY ("shiftingId") REFERENCES "Shifting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_internId_fkey" FOREIGN KEY ("internId") REFERENCES "InternProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_shiftingId_fkey" FOREIGN KEY ("shiftingId") REFERENCES "Shifting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------------

INSERT INTO "FlaggingRuleConfig" (
    "id", "absenceEarlyWarning", "consecutiveAbsences", "dropEligibleAbove",
    "evaluationPendingDays", "behindPaceTolerance", "updatedAt"
) VALUES ('seed-flagging-rules', 3, 3, 12, 7, 0, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "CheckInConfig" ("id", "timeInCutoff", "timeOutStart", "updatedAt")
VALUES ('seed-check-in-config', '07:30', '15:00', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "School" (
    "id", "name", "type", "municipality", "latitude", "longitude",
    "geofenceRadiusMeters", "createdAt", "updatedAt"
) VALUES
    ('seed-patria-national-high-school', 'Patria National High School', 'SECONDARY', 'Hamtic', 10.7132, 121.9569, 75, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-pandan-national-vocational-school', 'Pandan National Vocational School', 'SECONDARY', 'Pandan', 11.7218, 122.0942, 75, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-sebaste-high-school', 'Sebaste High School', 'SECONDARY', 'Sebaste', 11.5717, 122.0736, 75, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-bitadton-national-high-school', 'Bitadton National High School', 'SECONDARY', 'Bugasong', 10.9014, 122.0128, 75, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-northern-antique-vocational-school', 'Northern Antique Vocational School', 'SECONDARY', 'Libertad', 11.6467, 122.0864, 75, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-sta-justa-national-high-school', 'Sta. Justa National High School', 'SECONDARY', 'Culasi', 11.4247, 122.0294, 75, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-laboratory-high-school', 'Laboratory High School', 'SECONDARY', 'San Jose', 10.7473, 121.9319, 75, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-barbaza-national-high-school', 'Barbaza National High School', 'SECONDARY', 'Barbaza', 11.1425, 122.0503, 75, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-laua-an-national-high-school', 'Laua-an National High School', 'SECONDARY', 'Laua-an', 11.1633, 122.0092, 75, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-barbaza-central-school', 'Barbaza Central School', 'ELEMENTARY', 'Barbaza', 11.1428, 122.0508, 75, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-jinalinan-ipil-elementary-school', 'Jinalinan-Ipil Elementary School', 'ELEMENTARY', 'Barbaza', 11.1502, 122.0447, 75, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-malabor-elementary-school', 'Malabor Elementary School', 'ELEMENTARY', 'San Remigio', 11.0656, 121.9933, 75, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-tibiao-central-school', 'Tibiao Central School', 'ELEMENTARY', 'Tibiao', 11.2872, 122.0264, 75, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-culasi-north-elementary-school', 'Culasi North Elementary School', 'ELEMENTARY', 'Culasi', 11.4283, 122.0316, 75, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-sebaste-central-school', 'Sebaste Central School', 'ELEMENTARY', 'Sebaste', 11.5722, 122.0741, 75, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "AcademicYear" ("id", "label", "isArchived")
VALUES ('seed-2026-2027', '2026-2027', false)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Semester" ("id", "academicYearId", "name", "startDate", "endDate")
VALUES ('seed-2026-2027-sem1', 'seed-2026-2027', 'First Semester', '2026-08-01', '2026-12-19')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Shifting" (
    "id", "semesterId", "name", "startDate", "endDate",
    "requiredTeachingSessions", "requiredFinalDemos", "status", "activatedAt", "completedAt"
) VALUES
    ('seed-2026-2027-sem1-first', 'seed-2026-2027-sem1', 'FIRST', '2026-08-01', '2026-09-30', 15, 1, 'COMPLETED', '2026-08-01', '2026-09-30'),
    ('seed-2026-2027-sem1-second', 'seed-2026-2027-sem1', 'SECOND', '2026-10-01', '2026-12-19', 15, 1, 'ACTIVE', '2026-10-01', NULL)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "EvaluationCriterion" ("id", "order", "name", "weightPercent", "isActive") VALUES
    ('seed-criterion-1', 1, 'Lesson Planning', 15, true),
    ('seed-criterion-2', 2, 'Content', 20, true),
    ('seed-criterion-3', 3, 'Teaching Methods', 20, true),
    ('seed-criterion-4', 4, 'Classroom Management', 15, true),
    ('seed-criterion-5', 5, 'Questioning Skills', 15, true),
    ('seed-criterion-6', 6, 'Teacher''s Personality', 15, true)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "EvaluationItem" ("id", "criterionId", "order", "text", "isActive") VALUES
    ('seed-item-1-1', 'seed-criterion-1', 1, 'Specific learning outcomes are stated in behavioral terms', true),
    ('seed-item-1-2', 'seed-criterion-1', 2, 'There is congruence between specific learning outcomes and subject matter', true),
    ('seed-item-1-3', 'seed-criterion-1', 3, 'Teaching procedure is appropriate and well-structured', true),
    ('seed-item-1-4', 'seed-criterion-1', 4, 'Formative test is included and aligned with objectives', true),
    ('seed-item-1-5', 'seed-criterion-1', 5, 'Assignment is meaningful and appropriate', true),
    ('seed-item-1-6', 'seed-criterion-1', 6, 'Specific learning outcomes are achieved', true),
    ('seed-item-1-7', 'seed-criterion-1', 7, 'There is proper sequencing of the lesson', true),
    ('seed-item-2-1', 'seed-criterion-2', 1, 'PLACEHOLDER - awaiting the CTE''s official rating sheet (PRD section 10 Q2)', true),
    ('seed-item-3-1', 'seed-criterion-3', 1, 'PLACEHOLDER - awaiting the CTE''s official rating sheet (PRD section 10 Q2)', true),
    ('seed-item-4-1', 'seed-criterion-4', 1, 'PLACEHOLDER - awaiting the CTE''s official rating sheet (PRD section 10 Q2)', true),
    ('seed-item-5-1', 'seed-criterion-5', 1, 'PLACEHOLDER - awaiting the CTE''s official rating sheet (PRD section 10 Q2)', true),
    ('seed-item-6-1', 'seed-criterion-6', 1, 'Is neat and well-groomed', true),
    ('seed-item-6-2', 'seed-criterion-6', 2, 'Is free from mannerisms that tend to disturb students'' attention', true),
    ('seed-item-6-3', 'seed-criterion-6', 3, 'Shows dynamism and enthusiasm in teaching', true),
    ('seed-item-6-4', 'seed-criterion-6', 4, 'Has a pleasant disposition toward students', true),
    ('seed-item-6-5', 'seed-criterion-6', 5, 'Has a well-modulated voice', true),
    ('seed-item-6-6', 'seed-criterion-6', 6, 'The teacher''s personality commands respect and attention', true)
ON CONFLICT ("id") DO NOTHING;

-- All demo accounts use password: PracTrack2026!
-- These are application accounts for NextAuth, separate from Supabase Auth users.
INSERT INTO "User" (
    "id", "email", "passwordHash", "role", "status", "name", "phone", "createdAt", "updatedAt"
) VALUES
    ('seed-user-admin', 'dsantos@antiquespride.edu.ph', '$2b$10$GU/Llf1X2vrnTG6UdAYyj.GjY1TrLzHPIQDXbMTvdZdzkxKYKodrm', 'ADMIN', 'ACTIVE', 'Dr. Donna Santos', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-user-supervisor-mvillanueva', 'mvillanueva@antiquespride.edu.ph', '$2b$10$GU/Llf1X2vrnTG6UdAYyj.GjY1TrLzHPIQDXbMTvdZdzkxKYKodrm', 'SUPERVISOR', 'ACTIVE', 'Prof. Maria Villanueva', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-user-supervisor-jarcega', 'jarcega@antiquespride.edu.ph', '$2b$10$GU/Llf1X2vrnTG6UdAYyj.GjY1TrLzHPIQDXbMTvdZdzkxKYKodrm', 'SUPERVISOR', 'ACTIVE', 'Prof. Jose Arcega', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-user-supervisor-amalaguit', 'amalaguit@antiquespride.edu.ph', '$2b$10$GU/Llf1X2vrnTG6UdAYyj.GjY1TrLzHPIQDXbMTvdZdzkxKYKodrm', 'SUPERVISOR', 'ACTIVE', 'Prof. Ana Malaguit', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-user-supervisor-rcasipe', 'rcasipe@antiquespride.edu.ph', '$2b$10$GU/Llf1X2vrnTG6UdAYyj.GjY1TrLzHPIQDXbMTvdZdzkxKYKodrm', 'SUPERVISOR', 'ACTIVE', 'Prof. Ramon Casipe', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-user-ct-cferolin', 'cferolin@antiquespride.edu.ph', '$2b$10$GU/Llf1X2vrnTG6UdAYyj.GjY1TrLzHPIQDXbMTvdZdzkxKYKodrm', 'COOPERATING_TEACHER', 'ACTIVE', 'Mr. Carlo Ferolin', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-user-ct-rpineda', 'rpineda@gmail.com', '$2b$10$GU/Llf1X2vrnTG6UdAYyj.GjY1TrLzHPIQDXbMTvdZdzkxKYKodrm', 'COOPERATING_TEACHER', 'PENDING', 'Ms. Rosalinda Pineda', '09175551234', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-user-intern-jdelacruz', 'jdelacruz@antiquespride.edu.ph', '$2b$10$GU/Llf1X2vrnTG6UdAYyj.GjY1TrLzHPIQDXbMTvdZdzkxKYKodrm', 'STUDENT_INTERN', 'ACTIVE', 'Juan Dela Cruz', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-user-intern-msantos', 'msantos@antiquespride.edu.ph', '$2b$10$GU/Llf1X2vrnTG6UdAYyj.GjY1TrLzHPIQDXbMTvdZdzkxKYKodrm', 'STUDENT_INTERN', 'ACTIVE', 'Maria Santos', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-user-intern-preyes', 'preyes@antiquespride.edu.ph', '$2b$10$GU/Llf1X2vrnTG6UdAYyj.GjY1TrLzHPIQDXbMTvdZdzkxKYKodrm', 'STUDENT_INTERN', 'ACTIVE', 'Pedro Reyes', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-user-intern-aflores', 'aflores@antiquespride.edu.ph', '$2b$10$GU/Llf1X2vrnTG6UdAYyj.GjY1TrLzHPIQDXbMTvdZdzkxKYKodrm', 'STUDENT_INTERN', 'ACTIVE', 'Ana Flores', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-user-intern-mgarcia', 'mgarcia@antiquespride.edu.ph', '$2b$10$GU/Llf1X2vrnTG6UdAYyj.GjY1TrLzHPIQDXbMTvdZdzkxKYKodrm', 'STUDENT_INTERN', 'ACTIVE', 'Mark Garcia', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-user-intern-cnavarro', 'cnavarro@antiquespride.edu.ph', '$2b$10$GU/Llf1X2vrnTG6UdAYyj.GjY1TrLzHPIQDXbMTvdZdzkxKYKodrm', 'STUDENT_INTERN', 'ACTIVE', 'Claire Navarro', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-user-intern-ldomingo', 'ldomingo@antiquespride.edu.ph', '$2b$10$GU/Llf1X2vrnTG6UdAYyj.GjY1TrLzHPIQDXbMTvdZdzkxKYKodrm', 'STUDENT_INTERN', 'ACTIVE', 'Luis Domingo', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-user-intern-hcinco', 'hcinco@antiquespride.edu.ph', '$2b$10$GU/Llf1X2vrnTG6UdAYyj.GjY1TrLzHPIQDXbMTvdZdzkxKYKodrm', 'STUDENT_INTERN', 'ACTIVE', 'Hazel Cinco', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-user-intern-rlim', 'rlim@antiquespride.edu.ph', '$2b$10$GU/Llf1X2vrnTG6UdAYyj.GjY1TrLzHPIQDXbMTvdZdzkxKYKodrm', 'STUDENT_INTERN', 'ACTIVE', 'Rachel Lim', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-user-intern-btorres', 'btorres@antiquespride.edu.ph', '$2b$10$GU/Llf1X2vrnTG6UdAYyj.GjY1TrLzHPIQDXbMTvdZdzkxKYKodrm', 'STUDENT_INTERN', 'ACTIVE', 'Ben Torres', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-user-intern-rvillanueva', 'rvillanueva@antiquespride.edu.ph', '$2b$10$GU/Llf1X2vrnTG6UdAYyj.GjY1TrLzHPIQDXbMTvdZdzkxKYKodrm', 'STUDENT_INTERN', 'ACTIVE', 'Rhea Villanueva', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-user-intern-lmagno', 'lmagno@antiquespride.edu.ph', '$2b$10$GU/Llf1X2vrnTG6UdAYyj.GjY1TrLzHPIQDXbMTvdZdzkxKYKodrm', 'STUDENT_INTERN', 'ACTIVE', 'Lea Magno', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed-user-intern-jbautista', 'jbautista@antiquespride.edu.ph', '$2b$10$GU/Llf1X2vrnTG6UdAYyj.GjY1TrLzHPIQDXbMTvdZdzkxKYKodrm', 'STUDENT_INTERN', 'ACTIVE', 'Jerome Bautista', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("email") DO NOTHING;

INSERT INTO "SupervisorProfile" ("id", "userId", "department", "schoolId") VALUES
    ('seed-supervisor-profile-mvillanueva', 'seed-user-supervisor-mvillanueva', 'Language Education', 'seed-barbaza-national-high-school'),
    ('seed-supervisor-profile-jarcega', 'seed-user-supervisor-jarcega', 'Science Education', 'seed-patria-national-high-school'),
    ('seed-supervisor-profile-amalaguit', 'seed-user-supervisor-amalaguit', 'Social Studies Education', 'seed-bitadton-national-high-school'),
    ('seed-supervisor-profile-rcasipe', 'seed-user-supervisor-rcasipe', 'Mathematics Education', 'seed-pandan-national-vocational-school')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "CooperatingTeacherProfile" (
    "id", "userId", "schoolId", "approvedByUserId", "approvedAt"
) VALUES
    ('seed-ct-profile-cferolin', 'seed-user-ct-cferolin', 'seed-barbaza-national-high-school', 'seed-user-admin', CURRENT_TIMESTAMP),
    ('seed-ct-profile-rpineda', 'seed-user-ct-rpineda', 'seed-barbaza-national-high-school', NULL, NULL)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "InternProfile" (
    "id", "userId", "schoolNumber", "course", "yearLevel",
    "assignedSchoolId", "cooperatingTeacherId", "createdByUserId"
) VALUES
    ('seed-intern-profile-jdelacruz', 'seed-user-intern-jdelacruz', '2021-0045', 'BSEd-English', '3rd Year', 'seed-barbaza-national-high-school', 'seed-ct-profile-cferolin', 'seed-user-supervisor-mvillanueva'),
    ('seed-intern-profile-msantos', 'seed-user-intern-msantos', '2021-0046', 'BSEd-English', '3rd Year', 'seed-barbaza-national-high-school', 'seed-ct-profile-cferolin', 'seed-user-supervisor-mvillanueva'),
    ('seed-intern-profile-preyes', 'seed-user-intern-preyes', '2021-0047', 'BSEd-English', '3rd Year', 'seed-barbaza-national-high-school', 'seed-ct-profile-cferolin', 'seed-user-supervisor-mvillanueva'),
    ('seed-intern-profile-aflores', 'seed-user-intern-aflores', '2021-0048', 'BSEd-English', '3rd Year', 'seed-barbaza-national-high-school', 'seed-ct-profile-cferolin', 'seed-user-supervisor-mvillanueva'),
    ('seed-intern-profile-mgarcia', 'seed-user-intern-mgarcia', '2021-0049', 'BSEd-English', '3rd Year', 'seed-barbaza-national-high-school', 'seed-ct-profile-cferolin', 'seed-user-supervisor-mvillanueva'),
    ('seed-intern-profile-cnavarro', 'seed-user-intern-cnavarro', '2021-0050', 'BSEd-English', '3rd Year', 'seed-barbaza-national-high-school', 'seed-ct-profile-cferolin', 'seed-user-supervisor-mvillanueva'),
    ('seed-intern-profile-ldomingo', 'seed-user-intern-ldomingo', '2021-0051', 'BSEd-English', '3rd Year', 'seed-barbaza-national-high-school', 'seed-ct-profile-cferolin', 'seed-user-supervisor-mvillanueva'),
    ('seed-intern-profile-hcinco', 'seed-user-intern-hcinco', '2021-0052', 'BSEd-English', '3rd Year', 'seed-barbaza-national-high-school', 'seed-ct-profile-cferolin', 'seed-user-supervisor-mvillanueva'),
    ('seed-intern-profile-rlim', 'seed-user-intern-rlim', '2021-0053', 'BSEd-English', '3rd Year', 'seed-barbaza-national-high-school', 'seed-ct-profile-cferolin', 'seed-user-supervisor-mvillanueva'),
    ('seed-intern-profile-btorres', 'seed-user-intern-btorres', '2021-0054', 'BSEd-English', '3rd Year', 'seed-barbaza-national-high-school', 'seed-ct-profile-cferolin', 'seed-user-supervisor-mvillanueva'),
    ('seed-intern-profile-rvillanueva', 'seed-user-intern-rvillanueva', '2021-0055', 'BSEd-English', '3rd Year', 'seed-barbaza-national-high-school', 'seed-ct-profile-cferolin', 'seed-user-supervisor-mvillanueva'),
    ('seed-intern-profile-lmagno', 'seed-user-intern-lmagno', '2021-0056', 'BSEd-English', '3rd Year', 'seed-barbaza-national-high-school', 'seed-ct-profile-cferolin', 'seed-user-supervisor-mvillanueva'),
    ('seed-intern-profile-jbautista', 'seed-user-intern-jbautista', '2021-0057', 'BSEd-English', '3rd Year', 'seed-barbaza-national-high-school', 'seed-ct-profile-cferolin', 'seed-user-supervisor-mvillanueva')
ON CONFLICT ("id") DO NOTHING;

-- Prisma accesses PostgreSQL through the database role, which bypasses RLS.
-- Enabling RLS without public policies prevents direct anon/authenticated Data
-- API access to these custom-auth application tables.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupervisorProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CooperatingTeacherProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InternProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "School" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SchoolSupervisorHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AcademicYear" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Semester" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Shifting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AttendanceRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeachingSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvaluationCriterion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvaluationItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Evaluation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvaluationItemScore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SessionDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EndOfTermSubmission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Alert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FlaggingRuleConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CheckInConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PushSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

COMMIT;
