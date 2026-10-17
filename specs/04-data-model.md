# 04 — Data Model (Prisma schema spec)

Single Postgres schema (no multi-tenancy). `cuid()` ids, `createdAt`/`updatedAt` on
every model, soft delete **not** used (assessment scope; hard delete guarded by
referential checks in service). Money: integer **poisha-free BDT taka** (৳, `Int`).
Client generated to `prisma/generated` (gitignored), `moduleFormat = "cjs"`.

```prisma
generator client { provider = "prisma-client", output = "../prisma/generated", moduleFormat = "cjs" }
datasource db    { provider = "postgresql", url = env("DATABASE_URL") }

enum Role          { ADMIN TEACHER STUDENT PARENT }
enum UserStatus    { ACTIVE BLOCKED }
enum AttendanceStatus { PRESENT ABSENT LATE }
enum AdmissionStatus  { SUBMITTED APPROVED REJECTED }
enum InvoiceStatus    { PENDING PARTIAL PAID }
enum PaymentMethod    { CASH BANK_BKASH_ROCKET OTHER }
enum SubmissionStatus { SUBMITTED LATE_GRADED ON_TIME LATE }

model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  fullName     String
  role         Role
  status       UserStatus @default(ACTIVE)
  teacher      Teacher?
  student      Student?
  parent       Parent?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model Teacher {
  id        String  @id @default(cuid())
  userId    String  @unique
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  employeeId String @unique          // e.g. T-001
  phone     String?
  subjects  ClassSubject[]           // assignments (teacher ↔ class-subject)
  marks     ExamMark[]
  assignments Assignment[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Student {
  id          String  @id @default(cuid())
  userId      String? @unique          // null until admission approved / admin creates login
  user        User?   @relation(fields: [userId], references: [id], onDelete: SetNull)
  admissionNo String  @unique          // e.g. GHS-2026-001
  fullName    String
  dateOfBirth DateTime?
  gender      String?
  classId     String
  class       Class   @relation(fields: [classId], references: [id])
  sectionId   String?
  section     Section? @relation(fields: [sectionId], references: [id])
  parentId    String?
  parent      Parent? @relation(fields: [parentId], references: [id])
  rollNo      Int
  status      UserStatus @default(ACTIVE)
  attendance  AttendanceRecord[]
  marks       ExamMark[]
  submissions Submission[]
  invoices    Invoice[]
  payments    Payment[]
  riskScores  AtRiskScore[]
  @@unique([classId, rollNo])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Parent {
  id       String    @id @default(cuid())
  userId   String    @unique
  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  students Student[]
}

model Class {                    // "Class 6" … "Class 10"
  id       String    @id @default(cuid())
  name     String    @unique
  sections Section[]
  subjects ClassSubject[]
  students Student[]
  timetableSlots TimetableSlot[]
}

model Section {                  // "A", "B"
  id       String  @id @default(cuid())
  name     String
  classId  String
  class    Class   @relation(fields: [classId], references: [id], onDelete: Cascade)
  students Student[]
  timetableSlots TimetableSlot[]
  @@unique([classId, name])
}

model Subject {                  // school-wide catalog
  id     String @id @default(cuid())
  name   String @unique          // "Bangla 1st Paper" …
  code   String @unique
  classSubjects ClassSubject[]
  examMarks ExamMark[]
  assignments Assignment[]
}

model ClassSubject {             // who teaches what (Unifiedtransform scoping pattern)
  id        String  @id @default(cuid())
  classId   String
  class     Class   @relation(fields: [classId], references: [id], onDelete: Cascade)
  subjectId String
  subject   Subject @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  teacherId String?
  teacher   Teacher? @relation(fields: [teacherId], references: [id], onDelete: SetNull)
  @@unique([classId, subjectId])
}

model TimetableSlot {            // schema-only in MVP (UI backlog) — kept for completeness
  id        String  @id @default(cuid())
  classId   String
  class     Class   @relation(fields: [classId], references: [id], onDelete: Cascade)
  sectionId String
  section   Section @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  subjectId String
  subject   Subject @relation(fields: [subjectId], references: [id])
  dayOfWeek Int                       // 0=Sunday … 6=Saturday (BD week starts Sat; 6=Friday off)
  period    Int                       // 1..8
  @@unique([sectionId, dayOfWeek, period])
}

model AttendanceRecord {
  id        String           @id @default(cuid())
  studentId String
  student   Student          @relation(fields: [studentId], references: [id], onDelete: Cascade)
  date      DateTime         @db.Date
  status    AttendanceStatus
  markedById String?                          // teacher who marked
  @@unique([studentId, date])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Exam {
  id        String      @id @default(cuid())
  name      String                      // "Half-Yearly 2026"
  classId   String
  class     Class     @relation(fields: [classId], references: [id], onDelete: Cascade)
  startDate DateTime
  endDate   DateTime
  published Boolean     @default(false) // results visible to student/parent when true
  marks     ExamMark[]
  @@unique([name, classId])
}

model ExamMark {
  id        String  @id @default(cuid())
  examId    String
  exam      Exam    @relation(fields: [examId], references: [id], onDelete: Cascade)
  studentId String
  student   Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  subjectId String
  subject   Subject @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  marksObtained Int                     // validated 0..totalMarks (server-side)
  totalMarks    Int                     // default 100; per exam-subject
  @@unique([examId, studentId, subjectId])
}

model GradeBand {                 // THE canonical scale — single source of truth
  id         String @id @default(cuid())
  minPercent Int                       // inclusive lower bound
  maxPercent Int                       // inclusive upper bound
  letter     String                    // A+ A A- B C D F
  point      Float                     // 4.0 scale: 4.0 3.5 3.0 2.5 2.0 1.0 0.0
  @@unique([minPercent, maxPercent])
}

model Assignment {
  id          String   @id @default(cuid())
  title       String
  description String?
  subjectId   String
  subject     Subject  @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  classId     String
  class       Class    @relation(fields: [classId], references: [id], onDelete: Cascade)
  teacherId   String
  teacher     Teacher  @relation(fields: [teacherId], references: [id])
  dueDate     DateTime
  submissions Submission[]
  createdAt   DateTime @default(now())
}

model Submission {
  id           String           @id @default(cuid())
  assignmentId String
  assignment   Assignment       @relation(fields: [assignmentId], references: [id], onDelete: Cascade)
  studentId    String
  student      Student          @relation(fields: [studentId], references: [id], onDelete: Cascade)
  content      String                      // text answer (MVP: no file uploads)
  status       SubmissionStatus @default(SUBMITTED)
  grade        Int?                        // 0..100 teacher-assigned
  feedback     String?
  @@unique([assignmentId, studentId])
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model FeeHead {                   // "Monthly tuition", "Exam fee", "Lab fee"
  id       String    @id @default(cuid())
  name     String    @unique
  amount   Int                       // BDT taka
  classId  String?                   // null = applies to whole school
  class    Class?   @relation(fields: [classId], references: [id], onDelete: Cascade)
  invoices Invoice[]
}

model Invoice {                   // assigned charge (School-management pattern)
  id         String        @id @default(cuid())
  studentId  String
  student    Student       @relation(fields: [studentId], references: [id], onDelete: Cascade)
  feeHeadId  String
  feeHead    FeeHead       @relation(fields: [feeHeadId], references: [id])
  amount     Int                       // snapshot at assignment time
  dueDate    DateTime
  status     InvoiceStatus @default(PENDING)
  allocations PaymentAllocation[]
  createdAt  DateTime @default(now())
}

model Payment {
  id         String  @id @default(cuid())
  studentId  String
  student    Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  amount     Int                       // total received (>= sum(allocations))
  method     PaymentMethod
  reference  String?                  // txn id / cheque no
  recordedById String                  // admin who recorded
  allocations PaymentAllocation[]
  paidAt     DateTime @default(now())
}

model PaymentAllocation {          // waterfall ledger line (mines School-management lesson)
  id        String  @id @default(cuid())
  paymentId String
  payment   Payment @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  invoiceId String
  invoice   Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  amount    Int
}

model Notice {
  id        String   @id @default(cuid())
  title     String
  body      String
  authorId  String
  audience  Role?                    // null = ALL
  createdAt DateTime @default(now())
}

model AdmissionApplication {       // public 4-step form → admin review → enroll
  id           String          @id @default(cuid())
  formData     Json                      // validated shape: student+guardian fields (see 06)
  status       AdmissionStatus @default(SUBMITTED)
  reviewedById String?
  reviewNote   String?
  submittedAt  DateTime        @default(now())
  reviewedAt   DateTime?
}

model AtRiskScore {                // AI output, overwritten per recompute
  id         String   @id @default(cuid())
  studentId  String
  student    Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  score      Float                     // 0..1 probability
  atRisk     Boolean                   // score >= threshold (0.5, stored in model JSON)
  factors    Json                      // [{feature, value, contribution}] top contributors
  computedAt DateTime   @default(now())
  @@unique([studentId])
}

model AiProviderConfig {           // admin-controlled OpenAI-compatible LLM provider (spec 10)
  id          String  @id @default("singleton") // exactly one row
  name        String                             // display label, e.g. "DeepSeek"
  baseUrl     String                             // https://api.deepseek.com/v1
  textModel   String                             // deepseek-chat | gpt-4o-mini | llama3.1:8b …
  visionModel String?                            // image→text path; null = text-only
  apiKeyEnc   String?                            // AES-256-GCM ciphertext
  apiKeyHint  String?                            // "sk-…abcd" for UI mask
  temperature Float   @default(0.3)
  maxTokens   Int     @default(2048)
  enabled     Boolean @default(true)             // kill switch → AI routes 503
  updatedById String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// NOTE: teacher-toolkit models (TeachingPlan, QuestionPaper, Question,
// SourceDocument, SourceChunk + their enums) are specified in specs/10 and
// belong to this same schema — one datasource, one migration set.
```

## Canonical grade bands (seed `GradeBand`)

| min% | max% | letter | point |
|---|---|---|---|
| 80 | 100 | A+ | 4.0 |
| 70 | 79 | A | 3.5 |
| 60 | 69 | A− | 3.0 |
| 50 | 59 | B | 2.5 |
| 40 | 49 | C | 2.0 |
| 33 | 39 | D | 1.0 |
| 0 | 32 | F | 0.0 |

Pass mark per subject = 33%. GPA (exam) = mean of subject points. CGPA = mean of
published exam GPAs. **Exactly one implementation** lives in `exams/grading.util.ts`;
API responses embed computed letter+point; screens never recompute (School-management's
four-divergent-scales lesson).

## Seed dataset (`prisma/seed.ts`)

- Users: `admin@guziahs.edu`, `teacher1..3@guziahs.edu`, `student01..15@guziahs.edu`,
  `parent01..08@guziahs.edu` — all `password123` (bcrypt). Demo table in README.
- Classes 6–10, sections A/B; subjects: Bangla, English, Math, Science, ICT, BGS (6).
- ClassSubject rows with teacher assignments; roll numbers 1..15 for class 8-A
  (demo focus class).
- Attendance: last 60 school days for class 8-A (deterministic pseudo-random with
  seeded RNG: mostly present, a few students mostly-absent/late → guarantees the AI
  demo has clear at-risk cases).
- Exams: "First Term 2026" + "Mid-Year 2026" for class 8 with marks (deterministic;
  a couple of weak students so GPA trend is meaningful).
- Assignments (6) + submissions (mixed on-time/late/missing for same weak students).
- Fee heads (tuition 1200/mo, exam 800, lab 500) + invoices Oct–Dec (some PENDING/
  PARTIAL) + 3 payments to demo the waterfall.
- Admission applications: 2 SUBMITTED (pending queue), 1 APPROVED, 1 REJECTED.
- Notices (3). GradeBand rows (table above).
- `ai/train.ts` generates the training history from the same deterministic RNG
  (see specs/07) — not committed as DB rows.
