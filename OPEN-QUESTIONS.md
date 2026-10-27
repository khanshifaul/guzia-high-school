# Open Questions

The register of decisions only the founder can make. It exists because the
failure mode it prevents is silent: an agent hits an ambiguity, picks a
plausible default, and the assumption is then buried in a change nobody re-reads.

Each entry has a short question, why it matters, the options and their costs,
and a blank Answer line.

An entry is deleted when it is answered — the answer goes into a rule or a
memory file, not into a register of things still open.

## Open

One line per unanswered decision, because `zolly curious` counts `- ` lines
and reports `open_questions` from that count. The detail for each entry is
below. Delete both the line and its section when the answer lands.

- Q-0001 — the admission age window is skipped when no date of birth is sent
- Q-0002 — roll and admission numbers are allocated from a count read outside the transaction
- Q-0003 — a pending applicant cannot see their own application
- Q-0004 — two payments recorded at the same moment can over-allocate one invoice
- Q-0005 — re-running invoice generation double-bills every matched student
- Q-0006 — a fee head's class is stored but never used when generating invoices
- Q-0007 — a mark is accepted for a subject the exam does not include, or a student outside its class
- Q-0008 — the per-subject pass flag is computed and never used
- Q-0009 — publishing an exam does not lock its marks
- Q-0010 — any teacher can mark or read any section's attendance
- Q-0011 — is attendance a percentage of marked days or of school days?
- Q-0012 — an answer with no verified citation is shown as if it were sourced
- Q-0013 — the student edit dialog saves a roll number the API silently discards
- Q-0014 — a failed student create leaves a working login with no student

## Q-0001 — the admission age window is skipped when no date of birth is sent

**Question.** Should `POST /api/admissions` refuse an application with no
`dateOfBirth`, or stay optional?

**Why it matters.** `age.util.ts` says a missing date of birth "is [an error] on
the admission form" and its own spec pins `isAdmissibleAge(null) === false`,
but `admissions.service.ts` gates the check on `dto.dateOfBirth &&`, so a
request that omits the field stores an application with no age at all. The
public endpoint is reachable without the browser form.

**Options.** (a) mark `dateOfBirth` required in `SubmitApplicationDto` — one
line, closes the hole; (b) keep it optional and write down who may apply
without one, plus how an admin handles it in the queue.

**Answer.**

## Q-0002 — roll and admission numbers are allocated from a count read outside the transaction

**Question.** Should approval allocate numbers inside the transaction (serialised
or retried), or keep the current `count() + 1` scheme?

**Why it matters.** Both counts are read before the `$transaction`; two admins
approving at once compute the same `rollNo`/`admissionNo` and the unique
constraints reject the second with a 500. A deleted student also drops the
count, so the next approval reuses a number that already exists.

**Options.** (a) allocate inside the transaction with a row lock or bounded
retry; (b) a dedicated sequence table per class and a global one for admissions.

**Answer.**

## Q-0003 — a pending applicant cannot see their own application

**Question.** Should an applicant be able to log in and track their application
before a decision?

**Why it matters.** `(portal)/student/admissions` calls `/admissions/me`, but the
account created at submit is `BLOCKED` with an unguessable password, and the JWT
guard rejects any non-`ACTIVE` user. The page is reachable only after approval,
which is the moment it stops being useful — the spec's stated problem is
therefore still open.

**Options.** (a) issue a temporary credential at submit so the applicant can
track status; (b) keep the page post-approval only and correct the spec.

**Answer.**

## Q-0004 — two payments recorded at the same moment can over-allocate one invoice

**Question.** Should `recordPayment` re-read the student's invoices inside its
transaction (row lock or bounded retry), or is a single cashier assumed?

**Why it matters.** `fees.service.ts:112` reads invoices and their allocations,
`:124-131` computes outstanding and the waterfall on that snapshot, and only then
`:133` opens the transaction — which writes without re-reading. Two concurrent
payments for the same student both pass the "exceeds outstanding" guard and
allocate the same balance twice. Measured by replaying one snapshot twice: two
৳1200 payments both hit `inv-1` (amount 1200), leaving it with 2400 allocated.

**Options.** (a) re-read and allocate inside the transaction with `SELECT … FOR
UPDATE` on the student's invoices; (b) keep it simple and add an
`allocated ≤ invoice.amount` check inside the transaction so the second request
fails loudly instead of over-allocating.

**Answer.**

## Q-0005 — re-running invoice generation double-bills every matched student

**Question.** Should `POST /invoices/generate` be idempotent per fee head and due
date, or is a second invoice for the same head always a new installment?

**Why it matters.** `fees.service.ts:40-61` creates one invoice per matched
student unconditionally, and `Invoice` has no unique constraint
(`schema.prisma:365-376`). A double-click, a retry after a timeout, or a second
admin duplicates the whole batch. The answer decides the key: `(student,
head, dueDate)` prevents accidental duplicates and still allows installments.

**Options.** (a) unique on `(studentId, feeHeadId, dueDate)` plus a skip-or-fail
on re-run; (b) keep duplicates allowed and require the caller to pick a new due
date per installment, documented in the admin UI.

**Answer.**

## Q-0006 — a fee head's class is stored but never used when generating invoices

**Question.** Does a fee head created for one class mean only that class may be
billed, or is it just a label?

**Why it matters.** `createFeeHead` stores `classId` (`fees.service.ts:30-33`,
`schema.prisma:356-361`), but `generateInvoices` filters only on the request's
optional `dto.classId` (`:40-46`). An admin who creates a Class 6–only fee and
then generates it without a class filter bills every active student.

**Options.** (a) a class-scoped head may only be generated for that class —
reject or default the filter from the head; (b) drop the field if it is only a
label, so the UI stops implying a rule that is not enforced.

**Answer.**

## Q-0007 — a mark is accepted for a subject the exam does not include, or a student outside its class

**Question.** Should `POST /exams/:id/marks` reject a subject that has no
`ExamSubject` row and a student whose class is not the exam's class?

**Why it matters.** `submitMarks` validates only that `marksObtained ≤ total`
(`exams.service.ts:115-120`). A subject missing from the exam falls back to
`DEFAULT_TOTAL_MARKS = 100` and is upserted anyway (`:138-143`), and the student
id is never checked against `exam.classId`. Both rows then appear in
`reportCard` and `resultsForStudent`, so a crafted request adds a phantom
subject to a student's GPA. The admin/teacher UI only offers valid values; the
API accepts anything.

**Options.** (a) reject unknown subject ids and out-of-class students with a 400
naming them; (b) accept and ignore them, reporting the skipped count.

**Answer.**

## Q-0008 — the per-subject pass flag is computed and never used

**Question.** What makes an exam result a fail — one subject below 33%, or the
GPA below a threshold — and where should that be shown?

**Why it matters.** `gradeSubject` computes `passed` for every subject
(`grading.util.ts:68`), but nothing reads it: `reportCard` returns subjects and
`gpa` only, and `resultsForStudent` returns the same. A student who fails one
subject but scores well elsewhere shows a normal GPA with no fail marker, which
is not how the school reads a result.

**Options.** (a) BD rule — failing any subject fails the exam and is shown on the
report card; (b) each subject stands alone and the GPA is the only summary.

**Answer.**

## Q-0009 — publishing an exam does not lock its marks

**Question.** After `POST /exams/:id/publish`, should marks still be editable?

**Why it matters.** `publish` only flips `published`, which the spec defines as
"results visible to student/parent when true" (`specs/04-data-model.md:152`).
`submitMarks` never reads it, so a mark can change after students have seen the
result — their GPA moves with no record of the change.

**Options.** (a) reject mark edits while published; an admin must unpublish
first; (b) allow edits and show students the last-published snapshot.

**Answer.**

## Q-0010 — any teacher can mark or read any section's attendance

**Question.** Should `POST /attendance/mark` and `GET /attendance/section/:id`
be limited to the sections a teacher actually teaches?

**Why it matters.** The controller role-gates both to `ADMIN`/`TEACHER`
(`attendance.controller.ts:21-36`), and `attendance.service.ts:13-46` validates
only that the submitted students belong to the section — never that the caller
does. There is no teacher↔section check anywhere in `apps/api/src`. A Class 6
teacher can write a Class 10 section's attendance, and the per-student read is
guarded by `StudentAccessService` while the section write is not, so the two
rules disagree.

**Options.** (a) add the same relationship check the student read uses —
`ClassSubject` for the section; (b) admin-only for marking, teachers read-only.

**Answer.**

## Q-0011 — is attendance a percentage of marked days or of school days?

**Question.** Should a day nobody marked count against the student?

**Why it matters.** `weightedAttendancePct` divides by the number of records
(`attendance.util.ts:11-22`), so a student marked present on one day of a
forty-day term shows 100%. The formula is documented; what is not stated is
whether unmarked days are meant to be invisible. The same number feeds the
at-risk score (`at-risk.service.ts:169-171`, neutral when empty) and the student
stats (`students.service.ts:144`).

**Options.** (a) keep marked-days-only and show "no data" when nothing is
recorded; (b) divide by school days, treating an unmarked day as absent.

**Answer.**

## Q-0012 — an answer with no verified citation is shown as if it were sourced

**Question.** When the model answers but cites nothing that survives
verification, should the app replace the answer with "not in sources", show it
with an explicit unverified label, or keep it as is?

**Why it matters.** `ask` and `askNotebook` return whatever prose the model wrote
and drop only the citations that fail the page check (`sources.service.ts:596-600`,
`verifyCitations` at `:682-703`). The grounding rule lives in the system prompt
alone — nothing reads the citation count before returning. `workspaces.service.ts:246-250`
persists that answer, and `message-bubble.tsx:39` renders citation chips only
when there is at least one, so an uncited answer renders exactly like a sourced
one minus the chips. The product is described as a **cited** source assistant,
and the spec lists "abstained when out-of-scope?" as an acceptance question
(`specs/10-ai-teacher-toolkit.md:409`).

**Options.** (a) zero verified citations becomes the "not in sources" answer;
(b) show the prose with a visible "no citation found — unverified" label;
(c) keep it and treat grounding as advisory.

**Answer.**

## Q-0013 — the student edit dialog saves a roll number the API silently discards

**Question.** Should an admin be able to change a student's roll number (or
class) after creation, and if not, what should the form do?

**Why it matters.** The edit dialog posts `{ fullName, rollNo }`
(`apps/web/app/(portal)/admin/students/page.tsx:68-74`), and the service
destructures `rollNo` and `classId` away before the update
(`students.service.ts:280-283`), so the request returns 200, the UI says
"Student updated", and the roll number is unchanged. `UpdateStudentDto` is
`PartialType(CreateStudentDto)`, so the fields are accepted at the edge and
dropped one layer in.

**Options.** (a) honour `rollNo`/`classId` and re-check the
`@@unique([classId, rollNo])` constraint; (b) keep them immutable and remove
the field from the form and the DTO so the API cannot accept what it ignores.

**Answer.**

## Q-0014 — a failed student create leaves a working login with no student

**Question.** Should student creation be one transaction?

**Why it matters.** `create` writes the `User` row first and the `Student` row
second with no transaction around them (`students.service.ts:215-225`). If the
second write fails — an `admissionNo` collision from the count-based scheme in
Q-0002, a bad `sectionId`, a constraint — the login survives as an `ACTIVE`
STUDENT account with the submitted password and no student record, and the email
is then taken forever. `bulkCreate` catches the error per row and continues
(`:263-277`), so an import can leave one orphan login per failed row.

**Options.** (a) wrap both writes in one `$transaction`; (b) create the login in
a separate, explicit "invite" step so a partial state is a named state.

**Answer.**
