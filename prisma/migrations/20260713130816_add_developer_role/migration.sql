-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'DEVELOPER';

-- AlterTable
ALTER TABLE "site_settings" ADD COLUMN     "developerSettings" JSONB;
