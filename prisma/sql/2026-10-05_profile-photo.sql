-- CTE PracTrack — upgrade for an existing database bootstrapped from schema.sql
-- before 2026-10-05 (profile photo upload).
-- Run once in Supabase Dashboard > SQL Editor. Safe to re-run.

BEGIN;

-- One profile picture per account; the image itself is in Supabase Storage.
CREATE TABLE IF NOT EXISTS "ProfilePhoto" (
    "userId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfilePhoto_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "ProfilePhoto" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    ALTER TABLE "ProfilePhoto" ADD CONSTRAINT "ProfilePhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
