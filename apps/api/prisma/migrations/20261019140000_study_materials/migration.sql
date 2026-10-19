-- Persisted AI study materials (flashcards / mind map).
CREATE TYPE "MaterialKind" AS ENUM ('FLASHCARDS', 'MINDMAP');

CREATE TABLE "StudyMaterial" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "sourceId" TEXT,
    "classId" TEXT,
    "subjectId" TEXT,
    "kind" "MaterialKind" NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyMaterial_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudyMaterial_teacherId_createdAt_idx" ON "StudyMaterial"("teacherId", "createdAt");

ALTER TABLE "StudyMaterial" ADD CONSTRAINT "StudyMaterial_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
