-- Safe script to verify and fix schema drift issues
-- Run this in your database to ensure all changes are applied

-- Fix Badge table
DO $$
BEGIN
    -- Rename icon to iconUrl if icon exists
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'Badge' AND column_name = 'icon') THEN
        ALTER TABLE "Badge" RENAME COLUMN "icon" TO "iconUrl";
        RAISE NOTICE 'Renamed Badge.icon to iconUrl';
    END IF;

    -- Drop criteria column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'Badge' AND column_name = 'criteria') THEN
        ALTER TABLE "Badge" DROP COLUMN "criteria";
        RAISE NOTICE 'Dropped Badge.criteria column';
    END IF;
END $$;

-- Fix Activity table
DO $$
BEGIN
    -- Rename description to details if description exists
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'Activity' AND column_name = 'description') THEN
        ALTER TABLE "Activity" RENAME COLUMN "description" TO "details";
        RAISE NOTICE 'Renamed Activity.description to details';
    END IF;

    -- Make details nullable if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'Activity' AND column_name = 'details') THEN
        ALTER TABLE "Activity" ALTER COLUMN "details" DROP NOT NULL;
        RAISE NOTICE 'Made Activity.details nullable';
    END IF;

    -- Drop points column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'Activity' AND column_name = 'points') THEN
        ALTER TABLE "Activity" DROP COLUMN "points";
        RAISE NOTICE 'Dropped Activity.points column';
    END IF;
END $$;

-- Fix ProfileComment table
DO $$
BEGIN
    -- Rename profileUserId to userId if profileUserId exists
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'ProfileComment' AND column_name = 'profileUserId') THEN
        ALTER TABLE "ProfileComment" RENAME COLUMN "profileUserId" TO "userId";
        RAISE NOTICE 'Renamed ProfileComment.profileUserId to userId';

        -- Update foreign key constraint
        ALTER TABLE "ProfileComment" DROP CONSTRAINT IF EXISTS "ProfileComment_profileUserId_fkey";
        ALTER TABLE "ProfileComment" ADD CONSTRAINT "ProfileComment_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        RAISE NOTICE 'Updated ProfileComment foreign key';
    END IF;

    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                   WHERE conname = 'ProfileComment_id_userId_key') THEN
        ALTER TABLE "ProfileComment" ADD CONSTRAINT "ProfileComment_id_userId_key" UNIQUE ("id", "userId");
        RAISE NOTICE 'Added ProfileComment unique constraint';
    END IF;
END $$;

-- Fix ProfileVisit table
DO $$
BEGIN
    -- Rename visitedUserId to profileId if visitedUserId exists
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'ProfileVisit' AND column_name = 'visitedUserId') THEN
        ALTER TABLE "ProfileVisit" RENAME COLUMN "visitedUserId" TO "profileId";
        RAISE NOTICE 'Renamed ProfileVisit.visitedUserId to profileId';

        -- Update foreign key constraint
        ALTER TABLE "ProfileVisit" DROP CONSTRAINT IF EXISTS "ProfileVisit_visitedUserId_fkey";
        ALTER TABLE "ProfileVisit" ADD CONSTRAINT "ProfileVisit_profileId_fkey"
            FOREIGN KEY ("profileId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        RAISE NOTICE 'Updated ProfileVisit foreign key';
    END IF;

    -- Rename visitedAt to createdAt if visitedAt exists
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'ProfileVisit' AND column_name = 'visitedAt') THEN
        ALTER TABLE "ProfileVisit" RENAME COLUMN "visitedAt" TO "createdAt";
        RAISE NOTICE 'Renamed ProfileVisit.visitedAt to createdAt';
    END IF;

    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                   WHERE conname = 'ProfileVisit_id_profileId_key') THEN
        ALTER TABLE "ProfileVisit" ADD CONSTRAINT "ProfileVisit_id_profileId_key" UNIQUE ("id", "profileId");
        RAISE NOTICE 'Added ProfileVisit unique constraint';
    END IF;
END $$;

SELECT 'Schema verification and fixes completed!' AS status;
