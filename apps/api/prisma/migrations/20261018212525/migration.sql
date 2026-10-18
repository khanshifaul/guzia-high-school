/*
  Warnings:

  - Made the column `sectionId` on table `ClassSubject` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ClassSubject" ALTER COLUMN "sectionId" SET NOT NULL;
