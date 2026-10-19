-- The server owns the total for each (exam, subject). The client sends only
-- marksObtained, so a caller cannot inflate the total to slip a mark past
-- the 0..total check.
CREATE TABLE "ExamSubject" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "totalMarks" INTEGER NOT NULL DEFAULT 100,

    CONSTRAINT "ExamSubject_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExamSubject_examId_subjectId_key" ON "ExamSubject"("examId", "subjectId");
CREATE INDEX "ExamSubject_subjectId_idx" ON "ExamSubject"("subjectId");

ALTER TABLE "ExamSubject"
    ADD CONSTRAINT "ExamSubject_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamSubject"
    ADD CONSTRAINT "ExamSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed each (exam, subject) pair that already has marks, with the total that
-- was recorded on those marks.
INSERT INTO "ExamSubject" ("id", "examId", "subjectId", "totalMarks")
SELECT gen_random_uuid()::text, m."examId", m."subjectId", MAX(m."totalMarks")
FROM "ExamMark" m
GROUP BY m."examId", m."subjectId";
