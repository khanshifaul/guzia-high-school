-- One invoice per student, fee head and due date (OPEN-QUESTIONS Q-0005).
-- A re-run of invoice generation for the same head and due date skips the
-- rows that already exist; a new installment needs a new due date.
--
-- Pre-check run before applying (target: localhost:5434/ghs):
--   SELECT "studentId", "feeHeadId", "dueDate", COUNT(*) AS n, array_agg(id) AS ids
--   FROM "Invoice" GROUP BY 1,2,3 HAVING COUNT(*) > 1;
--   -> 0 rows.
CREATE UNIQUE INDEX "Invoice_studentId_feeHeadId_dueDate_key"
    ON "Invoice"("studentId", "feeHeadId", "dueDate");
