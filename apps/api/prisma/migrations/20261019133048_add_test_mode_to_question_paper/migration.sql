-- CreateEnum
CREATE TYPE "TestMode" AS ENUM ('OFFLINE', 'ONLINE');

-- DropIndex
DROP INDEX "SourceChunk_embedding_idx";

-- AlterTable
ALTER TABLE "QuestionPaper" ADD COLUMN     "endAt" TIMESTAMP(3),
ADD COLUMN     "mode" "TestMode" NOT NULL DEFAULT 'OFFLINE',
ADD COLUMN     "startAt" TIMESTAMP(3);
