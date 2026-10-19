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
| `grades` | `/exams`, `/exams/grade-bands` | **New exam** dialog (name, class, start/end date) → POST `/exams`; exams list with publish toggle; **canonical grade-scale editor** reading the live bands from GET `/exams/grade-bands` — editable min % / max % / letter / point rows, add/remove a band, "Save scale" PUTs the whole set and shows the server's reason when it is rejected (not contiguous / not 0–100) |
| `attendance` | `/attendance` | pick class/section/date → matrix view (students × last 10 days) |
| `fees` | `/fee-heads`, `/invoices/generate`, `/payments` | fee heads CRUD; generate invoices (head × class/students × due date); **record payment** page: student picker → outstanding list → amount → waterfalls live preview → submit |
| `notices` | `/notices` | CRUD, audience select |
| `at-risk` (+`/[studentId]`) | `/ai/at-risk`, `/ai/at-risk/:studentId` | model card (threshold, trained-at, metrics from eval report), recompute button (info banner while running), sortable table: student, class, score (progress bar), top-3 factor chips **with magnitudes** ("Attendance ↓ 44%"), badge HIGH/MEDIUM/LOW; the student name drills into `at-risk/[studentId]`: risk score vs threshold, each of the 5 factors with its value, which ones raise/lower the risk, attendance % / CGPA / fees, exam results |
| `settings` | `/ai/provider-config` | profile + change-password; **AI provider panel** (specs/10): provider label, base URL, text model, vision model, API key (masked, write-only), temperature, enabled toggle + **Test connection** button (latency/raw reply, works with unsaved values); 60s-apply note displayed |

## Teacher portal (`(portal)/teacher/`)

| Page | Backs | Behavior |
|---|---|---|
| `dashboard` | GET `/teacher/dashboard` | my sections (with today's attendance marked/unmarked badge), assignments awaiting grading, plan progress % — plus the quick-link grid |
| `classes` | `/classes` (scoped) | my classes → rosters |
| `classes/[id]` | student list | section roster with attendance % + latest GPA per student |
| `attendance/mark` | `/attendance/section/:id`, `/attendance/mark` | date picker (default today) → row per student: P/A/L segmented buttons (keyboard: arrow+enter fast path), "mark all present" shortcut, submit → upsert, success banner |
| `grades/entry` | `/exams/:id/marks` | exam+subject select → marks grid (roll, name, input 0..total; inline red on out-of-range), CSV paste box (roll,marks lines → prefills), submit bulk upsert |
| `assignments` (+`/new`) | `/assignments` | my assignments, create (subject of my class-subjects, due date) |
| `assignments/[id]` | submissions | grading table: student, content (expandable), grade input 0..100 + feedback, save |
| `notices` | POST `/notices` | class-audience notices |
| `studio` | `/workspaces`, `/ai/sources` | **notebook-style home**: the teacher's workspaces (search; one card per workspace with class/subject, source count, chat state and the last line; create / rename / delete) |
| `studio/[id]` | `/workspaces/:id*` | **the conversation workspace**: sources (attach from the library — a pointer, never a re-upload; detach), ONE persisted conversation (grounded in the attached sources, page-cited, citations open that page's text, "make paper"/"make plan" carry the workspace back), and the Studio pane (papers / plans / materials, each generated and opened from here) |
| `studio/library` | `/ai/sources`, `/workspaces/:id/sources` | **the reusable source library**: upload (file / URL / pasted text), search, grouped by class → subject, status, used-in-workspace count, multi-select "attach to workspace…", delete warns when it is attached somewhere |
| `plans/new`, `plans/[id]` | `/ai/plans*` | year/term plan: generate → editable week grid → activate; per-week regenerate; DONE checkboxes → progress bar (specs/10-A) |
| `tests/new`, `tests/[id]` | `/ai/tests*` | blueprint → generated paper; edit/add/delete questions, answer-key toggle, print view; "AI-generated — verify" badge (specs/10-B) |
| `sources/materials/[id]/print` | GET `/ai/materials/:id` | a saved flashcard deck or mind map on **its own page**, for printing: no portal chrome, auto-prints once, A4. Flashcards print as a table (question + blank answer column, or the answer key with `?answers=1`); the mind map prints as an indented outline rooted at the topic. The Studio's Materials tab opens it from the list |

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
  The "Online Services" cards point at `/portal/<service>`; the resolver reads the session
  server-side and sends each visitor to the page for their role, to the public page for the
  service, or to `/login?callbackUrl=/portal/<service>` when the service needs an account
  (`lib/online-services.ts` is the single table both the homepage and the resolver read).
- `portal/[service]/` — the Online Services resolver (see above).
- `login/` — centered-card recipe; prefilled demo-credential chips (click to fill).
- `admissions/` — 4-step wizard (student info → guardian info → academic choice → review+submit):
  zod schema per step (`lib/zod-schemas/admission.ts` — one schema per step, mirrored by the API DTO),
  progress bar (completed steps are clickable), per-step validation on "Next" that shows the
  message next to the offending field, a review step that lists what was entered with an "Edit"
  control per group, submit → POST `/admissions`
  → success screen with application id. Steps map 1:1 to AdmissionApplication.formData.
  The form carries a hidden `website` honeypot; the API refuses a non-blank one.
  Submit validates the whole application, not just the declaration, so a field changed after
  its step was passed (a blank permanent address, say) still sends the applicant back to the
  step that owns it (`stepForField`).
  The age is **derived from the date of birth**, never typed in: the wizard shows it read-only
  next to the date of birth, and the server recomputes it on submit (`common/age.util.ts`),
  so a client cannot store an age that disagrees with the date of birth. A date of birth
  outside the admission age window is refused with 400.
  **Section is not the applicant's to choose** — the administration assigns it at approval
  (`POST /admissions/:id/review` takes an optional `sectionId`, checked against the class);
  neither the form nor the payload carries one. **Group** exists only for Class 9 and 10:
  the field is hidden for other classes and the schema refuses a group there. **Previous
  Class** is derived from the class applied for — from Class 5 up to the class below it
  (Class 6 → Class 5; Class 10 → Class 5–9) — and is cleared when the class changes.
  **Attachments** are uploaded from the academic step and shown again on the review step.
  The student photo is held to the ID-card rule — **exactly 300×300 px, max 1 MB** — checked
  in the browser for an inline error and enforced by `POST /admissions/upload`.
  **Admission Type and Shift** are read from the site settings, so the school never offers
  a type (day/residential) or a shift it does not run.
  **`/admission?print=1` renders the application as a printable A4 sheet** — the form the
  applicant signs and submits with the school, not a receipt and not a second wizard. The
  sheet is the *default* rendering of that route: no form controls, no navigation, no portal
  chrome, so what comes out of the printer is the application and nothing else. The
  screen-only toolbar (print / new application) is hidden on paper with `print:hidden`.
  The sheet follows the project's canonical A4 print conventions (see
  `components/shared/test-paper.tsx`; the `@media print` block in `globals.css` for the page
  size), so there is one way to print a document in this project. It auto-prints once the
  sheet is ready, after `document.fonts.ready` and after every image has decoded — a photo
  still in flight would otherwise be missing from the paper — guarded by a ref so the
  applicant sees exactly one print dialog. The values come from the session
  (`admissionReceipt` + `admissionPrintData`), so no API call is involved.
  **The student photo is printed on the sheet itself**, in a 26 mm box at the top right of
  the letterhead, and the Attachments list calls it "Printed above" so the form never claims
  nothing is attached while a photo sits above it.
  **The sheet carries its own 12 mm margin** rather than relying on the `@page` margin: a
  print dialog set to "Margins: None" overrides `@page` and would print the form flush to the
  paper edge, but it cannot take away an element's own padding. The named page
  `@page admission-sheet { margin: 0 }` drops `@page`'s 12 mm so the two do not stack. The
  result is the same 12 mm margin on all four sides whatever the browser's margin setting is.
  Bilingual like the rest of the public site.

- **`/admission/success` shows the full application sheet by default**, not a receipt card —
  the form is the applicant's copy, so it is on the page without a click. The page keeps one
  button, **Print / Save as PDF**, which prints that sheet (photo included); "New Application"
  and "View Full Form" are gone, because the form is already there and printing it is the one
  thing left to do. Navbar, footer, the confirmation banner and the button are `print:hidden`,
  and the page's `main` drops its own padding in print, so the sheet is again the only thing
  on the paper. The receipt facts (application number, submitted status) stay in the
  banner above it.

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
grades. PUT `/exams/grade-bands` validates coverage 0–100, no overlaps, descending.

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

### 4. Admission submit → approve → enroll — `admissions.service.ts`
```
submit (public):
  user        = create User(email from form, random unguessable hash, role STUDENT, status BLOCKED)
  application = create AdmissionApplication({formData (+ derived age), status SUBMITTED, userId})
  email       = acknowledgement: application number + "result published in the notices"
  return {id, status, studentName, classWanted, emailSent}    // application number only

review(id, APPROVED):
  $transaction:
    admission = find SUBMITTED (else 409)
    admissionNo = "GHS-" + year + "-" + zeroPad(nextSeq, 3)      // seq from student count
    rollNo      = next roll in the target class/section
    user        = activate the pending account + bcrypt(fresh generatedPassword)
    student     = create Student({userId, admissionNo, rollNo, classId, sectionId})
    admission.status = APPROVED, reviewedBy/At set
  return {admissionNo, rollNo, email, generatedPassword}   // shown once in admin UI
```
**No credentials at apply time.** The account is `BLOCKED` until an admin approves it,
so a password printed on the receipt could never be used; the receipt carries the
application number only, and the result is published in the school notices. The admin
generates the password at approval and hands it over (the `generatedPassword` is an
unguessable `xxxx-xxxx-xxxx` one-time password). Reject: status + note only.

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
