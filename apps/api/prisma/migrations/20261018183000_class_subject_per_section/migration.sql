-- class-subject-per-section: a subject is taught per SECTION, and each
-- section may have a different teacher for the same subject.
-- ClassSubject rows are fully seed-derived, so clear them before evolving.

-- 1. Drop the old (classId, subjectId) unique index.
DROP INDEX IF EXISTS "ClassSubject_classId_subjectId_key";

-- 2. Clear existing rows (recreated by `bun run db:seed`).
DELETE FROM "ClassSubject";

-- 3. Add the required sectionId column.
ALTER TABLE "ClassSubject" ADD COLUMN "sectionId" TEXT;

-- 4. FK to Section.
ALTER TABLE "ClassSubject" ADD CONSTRAINT "ClassSubject_sectionId_fkey"
  FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. New unique: one teacher per (class, section, subject).
CREATE UNIQUE INDEX "ClassSubject_classId_sectionId_subjectId_key"
  ON "ClassSubject"("classId", "sectionId", "subjectId");
