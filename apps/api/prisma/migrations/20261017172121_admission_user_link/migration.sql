-- AlterTable
ALTER TABLE "AdmissionApplication" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "SiteSetting" ADD COLUMN     "developedByUrl" TEXT NOT NULL DEFAULT 'https://shifaul.dev',
ALTER COLUMN "developedBy" SET DEFAULT 'Shifaul Islam';
