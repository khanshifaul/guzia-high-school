# 06 — Features & Business Logic (per role)

Pages listed with their backing endpoints. All pages: page-header recipe, skeleton
while loading, empty-state, inline status banner on mutation, responsive (mobile
drawer sidebar). Bilingual labels throughout.

## Admin portal (`(portal)/admin/`)

| Page | Backs | Behavior |
|---|---|---|
| `dashboard` | aggregate GETs | stat cards: total students, teachers, today attendance % (all sections), pending admissions (badge), pending fee amount; at-risk mini-list (top 5) |
| `students` | `/students` | row-card list, search + class/section filter, pagination; actions: view/edit/block |
| `students/new` | POST `/students` | form-card; creates user+student |
| `students/[id]` | GET/PATCH | profile + tabs: attendance summary, results (all exams), fees ledger |
| `teachers` (+`/new`, `/[id]`) | `/teachers` | CRUD + class-subject assignment display |
| `classes` | `/classes`, `/subjects`, `/class-subjects` | manage sections, subjects, teacher assignments |
| `admissions` | `/admissions`, review | queue of SUBMITTED (count badge in sidebar); detail view of 4-step data; Approve (confirm-modal → creates student, shows generated creds once) / Reject (note) |
| `grades` | `/exams`, `/grade-bands` | exams CRUD + publish toggle; band editor (replace-set) |
| `attendance` | `/attendance` | pick class/section/date → matrix view (students × last 10 days) |
| `fees` | `/fee-heads`, `/invoices/generate`, `/payments` | fee heads CRUD; generate invoices (head × class/students × due date); **record payment** page: student picker → outstanding list → amount → waterfalls live preview → submit |
| `notices` | `/notices` | CRUD, audience select |
| `at-risk` | `/ai/at-risk` | model card (threshold, trained-at, metrics from eval report), recompute button (info banner while running), sortable table: student, class, score (progress bar), top-3 factor chips, badge HIGH/MEDIUM/LOW |
| `settings` | `/ai/provider-config` | profile + change-password; **AI provider panel** (specs/10): provider label, base URL, text model, vision model, API key (masked, write-only), temperature, enabled toggle + **Test connection** button (latency/raw reply, works with unsaved values); 60s-apply note displayed |

## Teacher portal (`(portal)/teacher/`)

| Page | Backs | Behavior |
|---|---|---|
| `dashboard` | rosters + today | my classes, today's unmarked attendance sections, assignments awaiting grading |
| `classes` | `/classes` (scoped) | my classes → rosters |
| `classes/[id]` | student list | section roster with attendance % + latest GPA per student |
| `attendance/mark` | `/attendance/section/:id`, `/attendance/mark` | date picker (default today) → row per student: P/A/L segmented buttons (keyboard: arrow+enter fast path), "mark all present" shortcut, submit → upsert, success banner |
| `grades/entry` | `/exams/:id/marks` | exam+subject select → marks grid (roll, name, input 0..total; inline red on out-of-range), CSV paste box (roll,marks lines → prefills), submit bulk upsert |
| `assignments` (+`/new`) | `/assignments` | my assignments, create (subject of my class-subjects, due date) |
| `assignments/[id]` | submissions | grading table: student, content (expandable), grade input 0..100 + feedback, save |
| `notices` | POST `/notices` | class-audience notices |
| `plans` (+`/new`, `/[id]`) | `/ai/plans*` | year/term plan: generate → editable week grid → activate; per-week regenerate; DONE checkboxes → progress bar (specs/10-A) |
| `tests` (+`/new`, `/[id]`) | `/ai/tests*` | blueprint → generated paper; edit/add/delete questions, answer-key toggle, print view; "AI-generated — verify" badge (specs/10-B) |
| `sources` (+`/[id]`) | `/ai/sources*` | dropzone upload (PDF/image) → status pills; summary card, page-tabbed text, ask box with citation chips, "make test from this" CTA (specs/10-C) |

## Student portal (`(portal)/student/`)

| Page | Backs | Behavior |
|---|---|---|
| `dashboard` | `/results/me`, `/attendance`, `/invoices`, `/notices` | stat cards: attendance %, CGPA, pending dues, open assignments; today schedule placeholder; recent notices |
| `attendance` | `/attendance` | monthly calendar heat-view (P green / A red / L amber) + weighted % (formula below) |
| `grades` | `/results/me` | per-exam cards: subject table (marks, total, letter, point), exam GPA; CGPA banner; **hidden entirely until published** |
| `fees` | `/invoices`, `/payments` | outstanding invoices (due date, overdue days badge) + payment history |
| `assignments` | `/assignments`, submit | due list, submit text (409 banner on resubmit), graded view |
| `notices` | `/notices` | list |

## Parent portal (`(portal)/parent/`)

Child selector (if multiple) → mirror of student pages scoped per child:
`dashboard`, `children/[id]` (attendance %, GPA, dues), `fees`, `notices`.
Endpoints enforce child linkage server-side.

## Public (`(public)/`)

- `page.tsx` — small landing: hero ("Guzia High School"), stats strip, notices preview, CTA → admissions/login.
- `login/` — centered-card recipe; prefilled demo-credential chips (click to fill).
- `admissions/` — 4-step wizard (student info → guardian info → academic choice → review+submit):
  zod schema per step, progress bar, review step editable, submit → POST `/admissions`
  → success screen with application id. Steps map 1:1 to AdmissionApplication.formData.

## Business logic (single implementations, unit-tested)

### 1. Grading — `apps/api/src/exams/grading.util.ts`
```
percent(marks, total)          = marks / total * 100
band(percent)                  = GradeBand where min ≤ percent ≤ max  → {letter, point}
examGPA(marks[])               = mean(points of each subject band)     (round 2dp)
cgpa(publishedExamGPAs[])      = mean                                    (round 2dp)
isPass(marks, total)           = marks >= 33
```
Report-card response embeds computed band per subject. No other code path computes
grades. PUT `/grade-bands` validates coverage 0–100, no overlaps, descending.

### 2. Weighted attendance % — `attendance/attendance.util.ts` (School-management pattern)
```
attendancePct(records) = (PRESENT·1 + LATE·0.5) / totalRecords * 100   (round 1dp)
```
Shown on admin student detail, teacher roster, student/parent dashboard.
At-risk feature uses the same helper (last 60 school days window).

### 3. Payment waterfall — `fees/waterfall.util.ts` + service transaction
```
allocate(payment.amount, invoices sorted by dueDate asc, status ≠ PAID):
  remaining = payment.amount
  for inv in invoices:
    outstanding = inv.amount − sum(inv.allocations.amount)
    take = min(remaining, outstanding)
    emit PaymentAllocation(inv, take); remaining −= take
    inv.status = (outstanding − take == 0) ? PAID : PARTIAL
  return {allocations, unallocated: remaining}   // unallocated > 0 → kept as credit on student
```
Runs in a Prisma `$transaction`; partial amounts never orphan (School-management
lesson: application of money is a ledger, not a boolean). Overdue days computed
on read: `max(0, days(now − dueDate))` for status ≠ PAID.

### 4. Admission approve → enroll — `admissions.service.ts` transaction
```
review(id, APPROVED):
  $transaction:
    admission = find SUBMITTED (else 409)
    admissionNo = "GHS-" + year + "-" + zeroPad(nextSeq, 3)      // seq from student count
    rollNo      = next roll in target section (or class)
    user        = create User(email from form, bcrypt(generatedPassword), role STUDENT)
    student     = create Student({...form academic fields, userId, admissionNo, rollNo})
    admission.status = APPROVED, reviewedBy/At set
  return {generatedPassword}   // shown once in admin UI
```
Deterministic demo password generation = `ghs` + last 4 of admissionNo + `!` (documented
in README). Reject: status + note only.

### 5. Marks entry guard — `exams.service.ts`
Server-side re-fetch of totalMarks per (exam, subject); reject any
`marksObtained < 0 || marksObtained > totalMarks` with 400 naming the limit
(Unifiedtransform's cap-validation lesson). Bulk endpoint is all-or-nothing (transaction).

### 6. Roles & ownership — `auth/roles.guard.ts` + service checks
- Route level: `@Roles(ADMIN)` / `@Roles(TEACHER,ADMIN)` etc.
- Resource level (in services): STUDENT token → only own studentId rows (ids resolved
  from `req.user.sub → Student.userId`); PARENT → children ids from Parent.students.
  TEACHER → assignment/class-subject linkage check for marks & grading.
- Attendance marking: reject students not enrolled in the target section (400).

## Notable cross-role flows (demo script for live review)

1. **Admission → enrollment:** public form → admin queue badge → approve → student
   appears in roster with generated login.
2. **Classroom loop:** teacher marks today's attendance → student dashboard % updates
   → teacher enters First Term marks → publish → student sees GPA/CGPA.
3. **Money loop:** admin generates Dec tuition invoices → records a ৳2000 payment from
   a student owing ৳2500 → oldest invoice PAID (1200), second PARTIAL (800 of 1300) →
   student fee page reflects exactly this.
4. **AI loop:** admin at-risk → recompute → board flags student X (HIGH 0.82,
   factors: attendance 0.41, submission rate 0.25, GPA trend −0.20) → drill into
   student confirms the story.
