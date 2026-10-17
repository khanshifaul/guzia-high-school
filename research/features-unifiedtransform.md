# Unifiedtransform — Feature Set Analysis (idea mining for guzia-high-school)

Source: `/home/khan/Projects/school-mgmt-comparison/Unifiedtransform` (v2.x branch, mid-rewrite of v1.x)

## Stack (1 line)
Laravel 8.x (PHP ≥7.4) + Blade + Bootstrap 5 + MySQL 5.7 (Docker: nginx+php+mysql), Laravel Mix/webpack, spatie/laravel-permission ^4.2, stevebauman/purify ^4.0 (HTML sanitizing), FullCalendar 5.9.0, CKEditor (rich text), PHPUnit 9 (tests nearly absent). License: GPL v3.0 (composer.json says MIT — contradictory).

## Role Model
- **3 roles, string column** `users.role` ∈ {`admin`, `teacher`, `student`} + **spatie/laravel-permission** for ~50 granular permissions. **No parent role** — parent is data attached to a student (`student_parent_infos`: father/mother name+phone, parent_address; migration `database/migrations/2021_08_29_083730_...`).
- Permissions seeded in `database/seeders/PermissionSeeder.php` (e.g. `create exams rule`, `take attendances`, `save marks`, `promote students`, `update marks submission window`, CRUD verbs per module: notices/events/syllabi/routines/classes/sections/courses/grading systems).
- Granted at user creation, per role, inside `app/Repositories/UserRepository.php` → `createTeacher()` (line ~41 `givePermissionTo(...)`) and `createStudent()` (line ~103); admin gets everything in PermissionSeeder.
- Enforcement layers:
  - FormRequest `authorize()` → `auth()->user()->can('permission')` (e.g. `app/Http/Requests/AttendanceStoreRequest.php`, `ExamRuleStoreRequest.php`, `NoticeStoreRequest.php`).
  - Controller middleware: `$this->middleware(['can:view academic settings'])` (`app/Http/Controllers/AcademicSettingController.php` constructor).
  - UI gating via `@can` + raw `Auth::user()->role ==` checks in `resources/views/layouts/left-menu.blade.php` (e.g. Add Student only for admin and not while browsing an old session).
  - **No policies** — `app/Providers/AuthServiceProvider.php` is empty.
- Data-isolation traits (clever, reusable):
  - `app/Traits/AssignedTeacherCheck.php` — teacher may only touch marks/exams for a (session, semester, class, section, course) tuple where they are the assigned teacher; else `abort(404)`.
  - `app/Http/Controllers/AttendanceController.php:168` — a student can only view their own attendance (`role == "student" && id != requested` → 404).
- **One shared dashboard** for all roles (`app/Http/Controllers/HomeController.php`): counts of classes/students/teachers, male-student count, session notices. Role differentiation is purely menu items + permissions, not separate dashboards.
- Demo credentials: **admin@ut.com / password** (README + PermissionSeeder).

## Feature Inventory (module → sub-features)
Everything is scoped by `session_id` (academic year); routes in `routes/web.php` under `auth` middleware, prefix `school/` for admin creates.

1. **Academic structure** — SchoolSession (year) → Semester → SchoolClass → Section (name, room no.) → Course (class+semester). CRUD by admin; edit forms for class/section/course; classes page shows per-class sections, courses, syllabi.
2. **Browse-by-session (read-only history)** — Admin toggles `browse_session_id` in PHP session; `app/Traits/SchoolSession.php::getSchoolCurrentSession()` makes **every** query fall back to that session; toggling latest clears it (`app/Repositories/SchoolSessionRepository.php::browse`). Create/update UI hidden while browsing history. Neat "snapshot" pattern.
3. **Users: teachers & students** — Add/edit/view lists + profiles. Fields: name, email, gender, nationality, phone, address×2, city, zip, photo (base64→file via `app/Traits/Base64ToFile.php`), + student-only birthday/religion/blood_type. Student creation is transactional: user + parent info + academic info (`board_reg_no`) + class/section assignment via Promotion row (`UserRepository::createStudent`).
4. **Teacher assignment** — assign teacher to (semester, class, section, course) → `assigned_teachers` table; drives all teacher scoping.
5. **Attendance** — Two global modes: **by section** or **by course**, set in academic settings (`academic_settings.attendance_type`, default `section`); teacher takes present/absent checkboxes (status stored `"on"`/off); view lists + per-student calendar-style history (green Present / red Absent). Student self-view only.
6. **Exams & marks** — Exam (name, start/end datetime, class, course, semester); ExamRule per exam (`total_marks`, `pass_marks`, `marks_distribution_note`); teacher enters marks per exam per student, server-validated 0..total; `updateOrCreate` idempotent saves; admin can also create exams for teachers.
7. **Grading system** — GradingSystem (name, per class+semester+session) + GradeRule rows (`point`, `grade`, `start_at`–`end_at` range). Results view maps `final_marks` into a rule range → assigns point+grade.
8. **Final-marks workflow (the meaningful business process)** — Admin opens/closes a global **marks submission window** (`marks_submission_status` on/off). While open, teacher sees "Submit Final Marks": `calculated_marks` = client-side sum of all exam marks (readonly), teacher enters `final_marks` + free-text `note` (e.g. "Counted best 2 Quizzes from 3"). Once any FinalMark rows exist the button is replaced by a "submitted" message. Stored in `final_marks` table (calculated_marks, final_marks, note).
9. **Promotions (mass)** — Requires a previous session; admin picks previous class/section → all its students listed → assign each a new class+section in latest session, editable ID card number → batch insert (`PromotionRepository::massPromotion`, updateOrCreate keyed student+session+class+section). Promotion table doubles as the student↔class↔section assignment record.
10. **Routines (timetable)** — create/view per class+section.
11. **Syllabi** — upload file per class+course, view + download for admin/teacher/student.
12. **Assignments** — teacher creates per assigned course w/ file upload; list + download; students view/download (`submit assignments` permission exists but **no submission flow** implemented in v2).
13. **Notices** — CKEditor rich text, HTML-purified (`app/Providers/PurifySetupProvider.php`), per session, shown on dashboard.
14. **Events calendar** — FullCalendar drag-to-create; single AJAX endpoint `calendar-crud-ajax` switching create/edit/delete (`app/Http/Controllers/EventController.php`).
15. **Auth** — Laravel UI: login, register, password reset, email verification, change own password (`Auth/UpdatePasswordController`).
16. **Dashboard** — aggregate counts + notices (see Role Model).

**Explicitly NOT in v2** (README "Features yet to be migrated from v1.X"; UI shows disabled stub menu items): Stripe/payment, messaging, library, income & expense accounting, mass student/teacher import-export, report printing, certificates, multi-language. Disabled nav stubs: Payment, Staff, Library (`left-menu.blade.php`).

## Notable Business Logic (with paths)
| Logic | Where | Detail |
|---|---|---|
| Grade/point by range | `app/Http/Controllers/MarkController.php` `index()`/`showCourseMark()` | `final_marks >= rule.start_at && <= rule.end_at` → attach `point`,`grade` (naive nested loop over rules) |
| Mark cap validation | `MarkController::store()` | Server-side: fetch `ExamRule.total_marks` per submitted exam; reject marks > total ("Marks must be between 0 and X"); requires exam rules to exist first |
| Marks submission window | `database/migrations/2021_08_29_083346_create_academic_settings_table.php` (defaults `section`/`off`), `app/Repositories/AcademicSettingRepository.php:22-30`, UI gate `resources/views/marks/create.blade.php:21,36` | Global on/off switch; controls both UI and re-submission guard (`final_marks_submitted` count check) |
| Calculated vs final marks | `resources/views/marks/submit-final-marks.blade.php:38-45` | `calculated_marks` = Σ exam marks (computed in Blade, readonly input); teacher overrides with `final_marks` + justification `note` — a "curved grade with audit trail" pattern |
| Dual attendance mode | `app/Http/Controllers/AttendanceController.php` `create()/show()` | Branch on `academic_setting->attendance_type` ('section' vs 'course'); repository `getSectionAttendance`/`getCourseAttendance` |
| Session snapshot scoping | `app/Traits/SchoolSession.php`, `app/Repositories/SchoolSessionRepository.php::browse()`, `getPreviousSession()` | Session `browse_session_id` overrides "current session" app-wide; promotion only from immediately-previous session (take(2)[1]) |
| Teacher scoping | `app/Traits/AssignedTeacherCheck.php` | 404 unless logged-in teacher is assigned to exact course tuple |
| Mass promotion | `app/Repositories/PromotionRepository.php::massPromotion()` | Idempotent updateOrCreate keyed (student, session, class, section) |
| Student privacy | `app/Http/Controllers/AttendanceController.php:168` | Student→others' attendance = 404 |
| Rich-text sanitizing | `app/Providers/PurifySetupProvider.php` | HTMLPurifier config allowing CKEditor `figure` elements |

**Schema notes for scoping**: no DB foreign keys anywhere — all refs are bare `unsignedInteger` (app-level integrity only); demo seed covers the happy path (`database/seeders/*`, but only AcademicSetting+Permission run from `DatabaseSeeder` — the rest are test fixtures). API layer is a stub (`routes/api.php` = default `/user` only). Tests: 1 `AuthTest` + examples only (`tests/Feature/`).

**Known bug worth not copying**: `app/Http/Controllers/EventController.php::calendarEvents()` ends with `dd($event)` before `return response()->json($event)` — calendar AJAX writes dump instead of JSON.

## One-line quality verdict
Solid modular skeleton (Repository+Interface+DI service providers, FormRequest validation, spatie permissions, session-scoped data model) but v2 is a half-finished rewrite: no fees/library/transport/hostel modules at all, no DB FKs, near-zero tests, dead stub menus, and a stray `dd()` in the events endpoint — mine its **workflow ideas** (grading windows, snapshot sessions, mass promotion, teacher scoping), not its code quality.
