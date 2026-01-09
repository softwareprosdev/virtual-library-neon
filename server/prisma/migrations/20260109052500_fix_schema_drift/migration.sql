-- Fix Badge table: rename icon to iconUrl, drop criteria
ALTER TABLE "Badge" RENAME COLUMN "icon" TO "iconUrl";
ALTER TABLE "Badge" DROP COLUMN IF EXISTS "criteria";

-- Fix Activity table: rename description to details, drop points
ALTER TABLE "Activity" RENAME COLUMN "description" TO "details";
ALTER TABLE "Activity" DROP COLUMN IF EXISTS "points";
ALTER TABLE "Activity" ALTER COLUMN "details" DROP NOT NULL;

-- Fix ProfileComment table: rename profileUserId to userId
ALTER TABLE "ProfileComment" RENAME COLUMN "profileUserId" TO "userId";
ALTER TABLE "ProfileComment" DROP CONSTRAINT IF EXISTS "ProfileComment_profileUserId_fkey";
ALTER TABLE "ProfileComment" ADD CONSTRAINT "ProfileComment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add unique constraint for ProfileComment
DROP INDEX IF EXISTS "ProfileComment_pkey";
ALTER TABLE "ProfileComment" ADD CONSTRAINT "ProfileComment_id_userId_key" UNIQUE ("id", "userId");

-- Fix ProfileVisit table: rename visitedUserId to profileId, visitedAt to createdAt
ALTER TABLE "ProfileVisit" RENAME COLUMN "visitedUserId" TO "profileId";
ALTER TABLE "ProfileVisit" RENAME COLUMN "visitedAt" TO "createdAt";
ALTER TABLE "ProfileVisit" DROP CONSTRAINT IF EXISTS "ProfileVisit_visitedUserId_fkey";
ALTER TABLE "ProfileVisit" ADD CONSTRAINT "ProfileVisit_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add unique constraint for ProfileVisit
DROP INDEX IF EXISTS "ProfileVisit_pkey";
ALTER TABLE "ProfileVisit" ADD CONSTRAINT "ProfileVisit_id_profileId_key" UNIQUE ("id", "profileId");
