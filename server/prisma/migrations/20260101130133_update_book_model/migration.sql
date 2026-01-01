-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "coverUrl" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "isbn" TEXT,
ALTER COLUMN "fileUrl" DROP NOT NULL,
ALTER COLUMN "fileType" DROP NOT NULL;
