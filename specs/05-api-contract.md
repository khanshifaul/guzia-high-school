# 05 — API Contract (REST, NestJS)

Base: `http://localhost:4000/api`. Swagger UI at `/api/docs` (demo deliverable).
Auth: httpOnly cookie `ghs_token` (JWT, 7d) set by `/auth/login`; all routes except
`/auth/login`, `/admissions` (POST) and `/health` require a valid JWT
(`JwtAuthGuard` applied globally in `app.module`). Role checks via `@Roles()` +
`RolesGuard`. Resource ownership enforced in services (student/parent can only read
their own rows — ids come from the token, **never** from the query string).

**Student-scoped endpoints** (`GET /students/:id`, `/fees/ledger/:studentId`,
`/attendance/student/:studentId`, `/exams/results/student/:studentId`,
`/exams/:id/report-card/:studentId`) all take a student id in the path. A role
check is not sufficient, so every one of them calls
`StudentAccessService.assertCanViewStudent` first: ADMIN sees any student,
TEACHER the students of a class they are assigned to teach, STUDENT only
themselves, PARENT only their own children. Anything else → 403. The rule
lives in one place (`src/common/access/student-access.service.ts`) so it cannot
drift between modules.

Errors (global `HttpExceptionFilter`): `{ statusCode, message: string[], error }`.
Validation failures → 400 with class-validator messages array. Unauthorized → 401,
role mismatch → 403, missing row → 404, unique violation → 409.

List endpoints accept `?page=1&limit=20` (where applicable) and return
`{ data: T[], meta: { page, limit, total } }`; single resources return the object bare.

## Endpoints

### auth (`PublicDecorated` where noted)
| Method | Path | Roles | Body / notes |
|---|---|---|---|
| POST | `/auth/login` **public** | — | `{email, password}` → sets cookie, returns `{id, fullName, role}` |
| GET | `/auth/me` | any | current user from JWT |
| POST | `/auth/logout` | any | clears cookie |

### students
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/students` | ADMIN | `?search=&classId=&sectionId=&page=` |
| POST | `/students` | ADMIN | CreateStudentDto (email/password → linked User created) |
| GET | `/students/:id` | ADMIN; TEACHER (own class); STUDENT(self); PARENT(own child) | includes computed `attendancePct`, `cgpa` |
| PATCH | `/students/:id` | ADMIN | UpdateStudentDto |
| DELETE | `/students/:id` | ADMIN | sets status BLOCKED (not hard delete) |

### teachers
| Method | Path | Roles |
|---|---|---|
| GET `/teachers` · POST `/teachers` · PATCH `/teachers/:id` | ADMIN |
| GET `/teachers/:id` | ADMIN (incl. class-subject assignments) |

### classes (classes + sections + subjects + assignments)
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET `/classes` | all authed | tree: class → sections → subjects w/ teacher names |
| POST/PATCH/DELETE `/classes[/:id]` | ADMIN | |
| POST `/classes/:id/sections` · PATCH/DELETE `/sections/:id` | ADMIN | |
| GET/POST `/subjects` · PATCH/DELETE `/subjects/:id` | ADMIN (write) | |
| PATCH `/class-subjects/:id` | ADMIN | `{teacherId}` assign teacher |
| GET `/timetable?sectionId=` | all authed | schema-supported; UI backlog |

### attendance
| Method | Path | Roles | Notes |
|---|---|---|---|
| POST `/attendance/mark` | TEACHER, ADMIN | `{sectionId, date, records:[{studentId, status}]}` → upsert per [studentId,date]; server rejects marking for students not in section |
| GET `/attendance?studentId=&from=&to=` | self-scope | STUDENT/PARENT get own/child only |
| GET `/attendance/section/:sectionId?date=` | TEACHER (assigned), ADMIN | roster + status for marking UI |

### exams & grading
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET/POST `/exams` · PATCH/DELETE `/exams/:id` | ADMIN | |
| POST `/exams/:id/marks` | TEACHER (assigned subject), ADMIN | bulk upsert `[{studentId, subjectId, marksObtained, totalMarks}]`; server validates `0 ≤ marks ≤ total` (Unifiedtransform lesson) |
| POST `/exams/:id/publish` | ADMIN | flips `published` |
| GET `/exams/:id/report-card/:studentId` | self-scope | subject rows + letter/point per canonical bands + exam GPA |
| GET `/results/me` | STUDENT | published exams only: per-subject rows + GPA + CGPA |
| GET `/results/child/:studentId` | PARENT | same shape |
| GET/PUT `/grade-bands` | GET all; PUT ADMIN | PUT replaces full band set (validated: contiguous, non-overlapping, 0–100) |

### assignments
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET/POST `/assignments` · PATCH/DELETE `/assignments/:id` | TEACHER (own), ADMIN; STUDENT: list for own class | |
| POST `/assignments/:id/submissions` | STUDENT | `{content}`; unique [assignmentId,studentId] → 409 on resubmit (MVP: no edits) |
| PATCH `/submissions/:id/grade` | TEACHER (own assignment), ADMIN | `{grade 0..100, feedback}` → status ON_TIME/LATE_GRADED per dueDate |

### fees
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET/POST `/fee-heads` · PATCH/DELETE `/fee-heads/:id` | ADMIN | |
| POST `/invoices/generate` | ADMIN | `{feeHeadId, classId?, studentIds?, dueDate}` bulk-assign |
| GET `/invoices?studentId=&status=` | ADMIN; STUDENT/PARENT: own only | includes `overdueDays` |
| POST `/payments` | ADMIN | `{studentId, amount, method, reference?}` → **waterfall**: allocate to PENDING/PARTIAL invoices oldest-dueDate-first; creates Payment + PaymentAllocation rows; returns applied allocation |
| GET `/payments?studentId=` | ADMIN; STUDENT/PARENT own | |

### admissions (the showcase workflow)
| Method | Path | Roles | Notes |
|---|---|---|---|
| POST `/admissions` **public** | — | 4-step form payload (AdmissionApplicationDto, zod-mirrored client-side); honeypot field for spam |
| GET `/admissions?status=SUBMITTED` | ADMIN | review queue |
| POST `/admissions/:id/review` | ADMIN | `{decision: APPROVED|REJECTED, note?}`; on APPROVE runs transaction: create Student (admissionNo auto `GHS-2026-NNN`, rollNo next) + User (email from form, password = generated + returned once to admin for handout) + link; on REJECT just status. Re-review → 409 |

### notices
| Method | Path | Roles |
|---|---|---|
| GET `/notices` (role-filtered audience) | all | |
| POST/PATCH/DELETE `/notices[/:id]` | ADMIN; TEACHER (create only, class audience) |

### ai
| Method | Path | Roles | Notes |
|---|---|---|---|
| POST `/ai/at-risk/recompute` | ADMIN | recompute all ACTIVE students → upsert AtRiskScore; returns counts |
| GET `/ai/at-risk` | ADMIN | list `[{student, className, score, atRisk, factors}]` sorted score desc; `?atRisk=true` filter |
| GET `/ai/provider-config` | ADMIN | provider label, baseUrl, textModel, visionModel, temperature, enabled; **key masked** (`apiKeyHint`), raw key never returned |
| PUT `/ai/provider-config` | ADMIN | partial update; omitted/blank apiKey keeps stored key; applies ≤60s (cache invalidated on save) |
| POST `/ai/provider-config/test` | ADMIN | body = form values (may be unsaved) → `{ok, latencyMs, reply}` or `{ok:false, error}`; 5/min |

Teacher-toolkit AI endpoints (plans/tests/sources): see specs/10 for the full table.

Lesson plans (see specs/10 Feature A):

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET `/ai/plans` | TEACHER | the teacher's own plans, newest first |
| GET `/ai/plans/:id` | TEACHER | one plan with its weeks; 404 if not the teacher's |
| POST `/ai/plans/generate` | TEACHER | `{classId, subjectId, type, startDate, weeks?, topicsHint?}` → a DRAFT plan; 400 if `weeks` is outside 1–52 |
| PATCH `/ai/plans/:id` | TEACHER | `{title?, weeks?, status?}`; setting `ACTIVE` archives the teacher's other ACTIVE plan for the same class/subject/type |
| PATCH `/ai/plans/:id/weeks/:week` | TEACHER | edit one week's `topics`/`objective`/`assessment`; the other weeks are untouched |
| PATCH `/ai/plans/:id/weeks/:week/status` | TEACHER | `{status: "PLANNED"\|"DONE"}` — drives the plan's progress % |
| POST `/ai/plans/:id/weeks/:week/regenerate` | TEACHER | re-ask the AI for that week only, using the neighbouring weeks as context |
| DELETE `/ai/plans/:id` | TEACHER | delete the plan |

Teacher dashboard (the teacher's "today" view):

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET `/teacher/dashboard` | TEACHER | `{sections, assignmentsAwaitingGrading, plans}` — the teacher's own sections (flagged with today's attendance state), the assignments still holding unscored submissions, and their plan progress |

Online test delivery (test papers with `mode: ONLINE`; see specs/10 Feature B):

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET `/ai/tests/online/available` | STUDENT | online papers open to the student's class, with that student's attempt state |
| POST `/ai/tests/:id/attempts` | STUDENT | start (or resume) an attempt; 409 if already submitted, 400 outside `[startAt, endAt]` |
| POST `/ai/tests/attempts/:attemptId/answers` | STUDENT | save one answer; MCQ auto-scored, written answers left for the teacher |
| POST `/ai/tests/attempts/:attemptId/submit` | STUDENT | submit the attempt; sets `totalScore` from the auto-graded answers |
| GET `/ai/tests/:id/attempts` | TEACHER | every attempt on the teacher's own paper, with per-question answers |
| POST `/ai/tests/answers/:answerId/grade` | TEACHER | score a written answer; 400 if the score exceeds the question's marks |

### health
| GET `/health` **public** | — | `{ok: true}` (compose healthcheck / demo sanity) |

## Client typing

`bun run generate:api` (root) starts API, dumps `/api/docs JSON` →
`openapi-typescript` → `apps/web/types/guzia-api.d.ts`. `lib/api.ts` fetch wrapper:
`credentials:'include'`, JSON, throws `ApiError{status,messages}` on !ok → pages map
to inline error banners. **No hand-written response types in web.**

## Validation matrix (class-validator on DTOs, global `ValidationPipe({whitelist:true, forbidNonWhitelisted:true, transform:true})`)

- Strings: `@Length(2,120)` names; `@IsEmail()`; `@Matches(/^GHS-\d{4}-\d{3}$/)` admissionNo server-generated only.
- Numbers: `@Type(()=>Number) @IsInt() @Min(0) @Max(100)` marks; `@Min(1)` amounts.
- Dates: `@IsDateString()`; attendance `date` normalized to UTC midnight server-side before upsert.
- Enums: `@IsEnum(Role|AttendanceStatus|…)`; unknown fields rejected (409/400).
- Passwords: `@MinLength(8)` (seed uses `password123` — length 9, ok).
- Cross-field: marks ≤ totalMarks (service-level), grade-band replace validated as a set.
