-- AlterTable
ALTER TABLE "User" ADD COLUMN     "ageVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "birthDate" TIMESTAMP(3);
