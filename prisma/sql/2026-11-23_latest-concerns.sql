-- CTE PracTrack — upgrade for an existing database (latest concerns, see ENHANCEMENT_PLAN_4.md).
-- Run once in Supabase Dashboard > SQL Editor. Safe to re-run.
-- TAKE A BACKUP FIRST: this unpairs extra interns from over-assigned cooperating teachers,
-- merges duplicate sections and rewrites the email of already-deleted accounts.
--
-- Covers: 1:1 cooperating teacher <-> intern, Course/Year/Section uniqueness, freeing the email of
-- deleted accounts, supervisors without a department.

-- Enum values (must run outside the transaction below)
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'INTERN_CT_PAIRED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'INTERN_CT_UNPAIRED';

BEGIN;

-- ── 1. Cooperating teacher <-> intern is 1:1 ─────────────────────────────
-- A pairing whose teacher account was deleted is dead: free the intern.
UPDATE "InternProfile" i
SET "cooperatingTeacherId" = NULL
FROM "CooperatingTeacherProfile" c
JOIN "User" u ON u."id" = c."userId"
WHERE i."cooperatingTeacherId" = c."id" AND u."deletedAt" IS NOT NULL;

-- A teacher who already has several interns keeps the one they ran the most sessions with
-- (ties: the oldest profile id). The others become unpaired so the supervisor can pair them again.
-- The list is printed as NOTICEs so it can be handed to the supervisors.
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        WITH ranked AS (
            SELECT i."id", i."cooperatingTeacherId", u."name",
                   ROW_NUMBER() OVER (
                       PARTITION BY i."cooperatingTeacherId"
                       ORDER BY (SELECT COUNT(*) FROM "TeachingSession" s
                                 WHERE s."internId" = i."id" AND s."cooperatingTeacherId" = i."cooperatingTeacherId") DESC,
                                i."id"
                   ) AS rn
            FROM "InternProfile" i
            JOIN "User" u ON u."id" = i."userId"
            WHERE i."cooperatingTeacherId" IS NOT NULL
        )
        SELECT "id", "name", "cooperatingTeacherId" FROM ranked WHERE rn > 1
    LOOP
        RAISE NOTICE 'Unpaired intern % (%) from cooperating teacher %', r."name", r."id", r."cooperatingTeacherId";
        UPDATE "InternProfile" SET "cooperatingTeacherId" = NULL WHERE "id" = r."id";
    END LOOP;
END $$;

DROP INDEX IF EXISTS "InternProfile_cooperatingTeacherId_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "InternProfile_cooperatingTeacherId_key" ON "InternProfile"("cooperatingTeacherId");

-- ── 2. Course / Year level / Section ─────────────────────────────────────
-- The old rule (section name unique on its own) must go first: tidying turns "BSEd-Eng 4A" into "A".
ALTER TABLE "Section" DROP CONSTRAINT IF EXISTS "Section_name_key";
DROP INDEX IF EXISTS "Section_name_key";

-- Tidy the free-typed values: "BSED - MATH" -> "BSED-MATH", "4" / "4th" -> "4th Year".
-- A section named like "BSEd-Eng 4A" is reduced to its letter ("A") and its year level.
UPDATE "Section"
SET "yearLevel" = CASE substring("name" from '(\d)\s*[A-Za-z]+$')
                      WHEN '1' THEN '1st Year' WHEN '2' THEN '2nd Year' WHEN '3' THEN '3rd Year'
                      WHEN '4' THEN '4th Year' WHEN '5' THEN '5th Year' ELSE "yearLevel" END,
    "name" = upper(substring("name" from '\d\s*([A-Za-z]+)$'))
WHERE "name" ~ '\d\s*[A-Za-z]+$';

UPDATE "Section"
SET "course" = regexp_replace(upper(btrim("course")), '\s*-\s*', '-', 'g'),
    "yearLevel" = CASE substring("yearLevel" from '^\s*(\d)')
                      WHEN '1' THEN '1st Year' WHEN '2' THEN '2nd Year' WHEN '3' THEN '3rd Year'
                      WHEN '4' THEN '4th Year' WHEN '5' THEN '5th Year' ELSE "yearLevel" END,
    "name" = upper(btrim("name"));

-- Sections that became identical after tidying are merged into the oldest one.
UPDATE "InternProfile" i
SET "sectionId" = k."keep"
FROM (
    SELECT "id", FIRST_VALUE("id") OVER (PARTITION BY "course", "yearLevel", "name" ORDER BY "createdAt", "id") AS "keep"
    FROM "Section"
) k
WHERE i."sectionId" = k."id" AND k."id" <> k."keep";

DELETE FROM "Section" s
USING (
    SELECT "id", FIRST_VALUE("id") OVER (PARTITION BY "course", "yearLevel", "name" ORDER BY "createdAt", "id") AS "keep"
    FROM "Section"
) k
WHERE s."id" = k."id" AND k."id" <> k."keep";

CREATE UNIQUE INDEX IF NOT EXISTS "Section_course_yearLevel_name_key" ON "Section"("course", "yearLevel", "name");

-- Interns carry a copy of their section's course and year level; bring them in line.
UPDATE "InternProfile" i
SET "course" = s."course", "yearLevel" = s."yearLevel"
FROM "Section" s
WHERE i."sectionId" = s."id";

-- ── 3. Free the email of deleted accounts ────────────────────────────────
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deletedEmail" TEXT;
UPDATE "User"
SET "deletedEmail" = "email",
    "email" = 'deleted+' || "id" || '@invalid.local'
WHERE "deletedAt" IS NOT NULL AND "deletedEmail" IS NULL;

-- A deleted intern's School ID No. is freed so it can be registered again.
UPDATE "InternProfile" i SET "schoolNumber" = NULL
FROM "User" u WHERE u."id" = i."userId" AND u."deletedAt" IS NOT NULL AND i."schoolNumber" IS NOT NULL;

-- ── 4. Supervisors no longer have a department ───────────────────────────
ALTER TABLE "SupervisorProfile" ALTER COLUMN "department" DROP NOT NULL;

COMMIT;
