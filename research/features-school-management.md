# School-management — Feature Set (idea-mining extraction)

Target: `/home/khan/Projects/school-mgmt-comparison/School-management` (read-only analysis)

## Stack (1 line)
Next.js 16.1.6 App Router (React 19.2.3, TypeScript, Server Actions + API routes) + Tailwind CSS 4 + Prisma 7.4.2/PostgreSQL (via `@prisma/adapter-pg`) + Supabase Auth (`@supabase/ssr` cookie sessions) + SSLCommerz (`sslcommerz-lts`) payments + Cloudinary uploads + Gemini AI (`@google/genai`) + Zod/Recharts/Framer Motion — positioned as a multi-tenant school-management SaaS for the Bangladesh market (BDT currency, SSLCommerz gateway).

## Data model (29 Prisma models — `prisma/schema.prisma`)
`School`, `Subscription`, `Announcement`, `Student`, `Plan`, `SupportTicket`, `Teacher`, `User`, `StudyMaterial`, `TeacherNotice`, `Class`, `Section`, `Attendance`, `Result`, `Payment`, `SupportOption`, `SupportFAQ`, `Subject`, `TeacherSubject`, `Exam`, `Fee`, `ClassSchedule`, `Parent`, `Expense`, `Feedback`, `Notification`, `QuizRoom`, `QuizSubmission`, `SystemConfig`.
Enums: `AttendanceStatus {PRESENT, ABSENT, LATE}`, `Role {super_admin, admin, teacher, student, parent, accountant}`, `UserStatus {active, blocked}`.
Multi-tenancy: nearly every model carries `schoolId` (cascade delete from School); `User.schoolId` scopes every query. Demo seed: `admin|teacher|student|parent|accountant@school.local` / `Demo1234!` (`prisma/seed.ts`).

## Feature Inventory (module → sub-features)

### Public site — `src/app/(withCommonLayout)/`
- Home (hero, features, how-it-works, testimonials, FAQ, contact, blog teaser), `/pricing` (Plan-model driven), `/blogs`, `/about`, `/contact`, `/testimonials`, `/why-choose-us`, `/privacy`, `/allpages/team`, `/live-demo`
- `/Support` page driven by `SupportOption` + `SupportFAQ` models (icon/badge/color/order)
- `/login` (+ `/login/apply` school registration, `/login/super-admin`), ForgotPasswordModal

### Auth & RBAC
- Supabase email/password; `src/proxy.ts` = session-refresh middleware (cookie handling only, **no route protection**)
- `src/lib/getCurrentUser.ts`: Supabase auth user → `public.User` Prisma mirror (role, schoolId, status)
- Role gating copy-pasted per server action (`if (user.role !== "accountant") …`); hooks `useAuth.ts`, `useRoleGuard.ts`; `api/auth/role`; block/unblock users

### Super Admin — `dashboard/super-admin/`
- Schools CRUD (list/new/[id]/update/edit), subscriptions list, transaction logs (`api/admin/transactions`), subscription Plans CRUD, support tickets, add/all super-admin users (via `supabaseAdmin`, compensating rollback), maintenance (`SystemConfig` site name/logo)

### Principal — `dashboard/principal/`
- Teachers CRUD (add/edit/[id], `TeacherForm`), Students CRUD (add/edit, **bulk-add**: CSV template download + papaparse import + AI PDF import), announcements (audience/category/priority/publish+expiry/attachment), attendance view, subscription purchase (SSLCommerz), add support ticket
- ⚠️ `finance/`, `performance/`, much of `reports/` and dashboard home = **hardcoded mock data**

### Teacher — `dashboard/teacher/`
- my-classes + `[classId]` detail (roster; assignments panel = static mock), attendance marking (per student per date), results entry + per-class table with computed GPA + **CSV export** (Roll, Name, marks, Total, GPA, Grade)
- Live MCQ exams: create-exam (6-digit room code, duplicate check), my-exams, exam-result per room, mcq-results
- notices (`TeacherNotice` class-targeted), schedule (`ClassSchedule`), study-materials (Cloudinary upload), feedback (academic/behavior/participation scores + comment), profile

### Student — `dashboard/student/`
- Dashboard: stats (attendance %, CGPA, average grade, courses), financial overview (total/paid/pending + progress bar), merged activity feed (top 5), today's schedule, recent feedback
- Results: grouped per exam, per-subject grade/points, exam GPA, pass/fail, CGPA across exams, academic-standing banner, circular progress
- take-exam: 6-digit code join modal, ExamHall countdown with auto-submit, one-submission enforcement
- Payments: pending vs paid cards; pay all dues / per-fee / custom amount → SSLCommerz; history
- attendance, notices (+ `[id]` detail), feedback, progress charts (Recharts), profile, my-exams

### Parent — `dashboard/parent/`
- children list + `[studentId]` detail (attendance %, GPA, fees), fees page (due → SSLCommerz pay), results, attendance, notices, communication, reports, settings, profile; dashboard mirrors student stats (GPA-trend points hardcoded)

### Accountant — `dashboard/accountant/`
- Dashboard: fees collected, dues (count+amount from PENDING payments), net balance, expenses
- fee-collection: assign `Fee` (per-class or school-wide) → auto-notifies every student of that class
- due-list: outstanding-balance registry per student (total due, pending count, categories, oldest-due date, due-days) with search + class filter
- salary: monthly paid status; pay → `Expense` record + teacher notification; expenses CRUD; history; reports (mostly static); settings (profile + Supabase password change)

### Payments / finance subsystem
- Two gateway integrations: student fees AND school subscription plans, both SSLCommerz (sandbox/live via `SSL_IS_LIVE`); routes `api/payment/{initiate,success,fail,cancel}` + `api/subscription/{initiate,success}`
- `Payment` rows double as assigned invoice lines (PENDING) AND transactions (SUCCESS/FAIL/CANCEL); `Fee` = fee head; `Expense` = expenditures + salaries; `Subscription` = plan purchases

### Exams — two parallel systems
1. Formal: `Exam` (name/type/class/dates) + teacher-entered `Result.marks` → GPA on dashboards
2. Live quiz rooms: `QuizRoom` (unique 6-digit `roomCode`, JSON questions, duration, category/class) + `QuizSubmission` (auto-graded, `@@unique([roomCode, studentEmail])`); join by code, timed hall, per-room teacher results

### Communication / support
- `Announcement` (audience/category/priority/publishDate→expiryDate/attachment), `TeacherNotice`, `Notification` per user (academic/system/payment/alert, isRead, deep link) + NotificationDropdown, `SupportTicket` (priority/status/attachment) + super-admin handling

### AI feature (the one ML feature)
- `POST /api/upload-pdf` (`src/app/api/upload-pdf/route.ts`): Gemini 2.5 Flash (`GEMINI_API_KEY`), base64 PDF + strict 18-field student-record prompt, `responseMimeType: application/json`, fence-stripping JSON fallback → prefills principal's bulk-add import (papaparse CSV is the non-AI alternative)

## Notable Business Logic (with paths)

1. **Waterfall debt reconciliation** — `src/app/api/payment/success/route.ts:48-93`. "All Outstanding Dues"/"Custom Payment" applies the paid amount oldest-first across PENDING fee records: fully covered → SUCCESS; partial → pending record's `amount` reduced, stays PENDING. Ledger-line reuse of Payment rows.
2. **Four divergent grade scales** (mining gold — argues for one grading module):
   - `src/app/actions/student/dashboard.ts:51-57` — 80→4.0, 70→3.5, 60→3.0, 50→2.5, 40→2.0, 33→1.0 (CGPA = mean of per-result points)
   - `src/app/actions/parent/dashboard.ts:59-63` — same scale, duplicated
   - `src/app/(withDashboarLayout)/dashboard/teacher/results/page.tsx:192-205` — avg subject marks → 80→A+ 5.00, 70→A 4.00, 60→A- 3.50, 50→B 3.00, 40→C 2.00, 33→D 1.00 (CSV export)
   - `src/app/actions/student/results.ts:36-44,92-106` — exam GPA = mean of subject points; pass/fail at GPA ≥ 1.0; CGPA = mean of exam GPAs; overall grade estimated via `gpa*20+20`
3. **Weighted attendance rule** — `src/app/actions/student/dashboard.ts:38-45`: `(PRESENT×1 + LATE×0.5) / total × 100`.
4. **Attendance idempotent upsert** — `src/app/actions/teacher/attendance.ts:25-50`: date normalized to midnight; findFirst(studentId,date) → update-or-create; no DB unique constraint (app-level only).
5. **Due-list aggregation** — `src/app/actions/accountant/due-list.ts:32-92`: groups PENDING payments per student; oldest-due date → `dueDays`; category set-union; sorted totalDue desc; month filter.
6. **Fee pending calc** — `src/app/actions/student/dashboard.ts:144-165`, `parent/fees.ts:38-47`: `max(0, sum(class OR school-wide Fee) − sum(SUCCESS Payment))`; fee query ORs `classId = student's class` with `classId = null`.
7. **Live-exam timer + integrity** — `dashboard/student/take-exam/_components/ExamHall.jsx:45-66`: end-time persisted in localStorage (client-trusted), auto-submit at 0; server guard `api/exams/submit/route.js:28-36` blocks re-submission via composite unique; answer key compared server-side from stored JSON.
8. **"Never trust client amount"** — `src/app/api/subscription/initiate/route.ts:18-24`: plan price re-fetched from DB before hitting the gateway.
9. **AI bulk admission import** — `bulk-add/page.tsx:52-110` (template download, papaparse, required-field filter `registrationNo && firstName`, skip-count warning) + `api/upload-pdf/route.ts:27-72`; `addMultipleStudents` reports "N imported, M duplicates skipped".
10. **Salary payment = Expense + notification** — `src/app/actions/accountant/salary.ts:39-60`: monthly paid status derived from Expense records vs month start.
11. **Compensating rollback** — `src/app/actions/superadmin.ts:44-62`: Prisma insert failure after Supabase auth creation → auth user deleted.
12. **Activity feed merge** — `student/dashboard.ts:120-137`: announcements + results + feedback merged, time-sorted, top 5.

## Weak spots worth knowing when mining scope
- Role checks duplicated inline in ~40 server actions; middleware protects nothing (session refresh only)
- Principal finance/performance/reports, teacher assignments, parent GPA-trend = static mock UI
- Exam timer end-time trusted from localStorage (spoofable)
- Teacher CSV export uses 5.00-A+ scale while student/parent dashboards cap at 4.0
- Two exam systems (formal Exam/Result vs QuizRoom) never converge into one transcript
- Zod is a dependency but mostly unused; `any`-typed catch-and-log everywhere

## One-line quality verdict
Feature-rich, demo-grade SaaS with genuinely clever pieces (payment waterfall reconciliation, Gemini PDF→structured import, live timed quiz rooms, weighted attendance) buried under copy-pasted auth checks, four divergent grading scales, and several fully mocked dashboards — excellent idea-mining material for a leaner, more consistent system.
