# Existing `guzia-high-school` Repo — State Analysis

Source: `/run/media/khan/Studio/Projects/MyLab/guzia-high-school` (analyzed 2026-10-17, READ-ONLY).

## Identity

- **This IS an existing implementation of the app we are speccing** — package name is literally `guzia-high-school` v0.1.0. It is a bilingual (English/Bangla) 4-role high-school management portal ("Guzia High School", grades 6–10, Bangladeshi context).
- **Relationship to NT Tech assessment: not stated anywhere.** No doc (README/PLAN/AGENTS/CLAUDE) mentions the assessment. `PLAN.md` covers only one feature (admission form) and explicitly says "No persistence layer in this MVP."
- **Provenance**: derived from a school *website* template — marketing pages (`app/(public)/`), analytics leftovers (`components/ui/google-analytics.tsx`, `google-tag-manager.tsx`, `meta-pixel.tsx`, `tiktok-pixel.tsx`, `microsoft-clarity.tsx`), GSAP, leaflet map, floating dock, marquee, and a **fake canned "AI Assistant" chatbot** (`components/ui/chatbot.tsx` — hardcoded script, no LLM/ML at all).
- Working state: a polished front-end shell + real login/auth against Postgres; **all school data is static in-memory mock**. It is an earlier attempt/MVP, ~4 months old, untouched since.

## Stack

| Area | Choice | Evidence |
|---|---|---|
| Framework | Next.js **16.2.6** App Router, React **19.2.4**, TypeScript ^5 | `package.json` |
| Styling | Tailwind CSS **v4** (`@tailwindcss/postcss`), shadcn-style setup (theme blue, `components/ui`, `lib/utils.ts`) | `srcroot.config.json`, `postcss.config.mjs` |
| Auth | **better-auth ^1.6.11** + `@better-auth/prisma-adapter ^1.6.11`; email+password; custom `role` field (admin/teacher/student/parent) via `additionalFields` | `lib/auth.ts`, `lib/auth-client.ts` |
| ORM/DB | **Prisma ^7.8.0** + `@prisma/adapter-pg` → **PostgreSQL (Neon serverless)**; connection in `.env DATABASE_URL`. Client generated to `lib/generated/prisma` (gitignored). Single migration `20260523115456_init` | `prisma/schema.prisma`, `prisma.config.ts` |
| Schema content | **ONLY better-auth tables**: `User` (role: String default "student"), `Session`, `Account`, `Verification`. Zero domain models | `prisma/schema.prisma` |
| Seed | `prisma/seed.mjs`: upserts 4 demo users + password hashes (`password123`). No `prisma.seed` config / npm seed script in package.json; import path `./lib/generated/prisma/client` likely broken under node (resolves to `prisma/lib/...`) [INFERENCE — cannot execute] | `prisma/seed.mjs` |
| API style | **Only** `app/api/auth/[...all]/route.ts` (better-auth catch-all). No server actions (grep `"use server"`: 0). No domain REST endpoints | glob of `app/api` |
| Testing | `@playwright/test ^1.60.0` + `playwright` in devDeps — **zero test files, no playwright/vitest/jest config anywhere** | package.json; repo-wide regex scan |
| Middleware | BOTH `app/middleware.ts` and `proxy.ts` exist — near-identical role-gate code (Next 16 renamed middleware→proxy; `AGENTS.md` warns "This is NOT the Next.js you know", read `node_modules/next/dist/docs/`) | `app/middleware.ts`, `proxy.ts` |
| Notable deps | recharts, motion, gsap+@gsap/react, react-leaflet, next-themes, react-dropzone, date-fns, react-icons; **dead weight**: `better-sqlite3`, `@prisma/adapter-better-sqlite3`, `@prisma/adapter-neon`, `@neondatabase/serverless`, `bcryptjs` (better-auth hashes via `@better-auth/utils`) [INFERENCE for unused] | package.json |
| Package mgrs | BOTH `bun.lock` and `package-lock.json` present (bun: `trustedDependencies` for sharp) | root listing |
| i18n | Custom EN/BN context — `lib/language-context.tsx` (`t()`/`useLanguage`), `lib/data-translations.ts` | lib/ |

Env vars in use (`.env` on disk, contains **live Neon credentials + dev secret**): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`. **No `.env.example`** exists.

## Workspace Tree (3 levels, condensed)

```
guzia-high-school/
├── app/
│   ├── layout.tsx, globals.css, favicon.ico
│   ├── middleware.ts                 # role-gate #1
│   ├── proxy.ts                      # role-gate #2 (duplicate)
│   ├── api/auth/[...all]/route.ts    # ONLY API route
│   ├── login/ register/ forgot-password/    # auth pages (forgot-pw = stub)
│   ├── (public)/                     # marketing site
│   │   ├── page.tsx (home), about/, academics/, admissions/ (4-step form)
│   │   ├── news/, contact/, pages/
│   ├── (portal)/                     # role portals (all client + mock data)
│   │   ├── layout.tsx                # session guard + sidebar + stores providers
│   │   ├── admin/    dashboard + students(/new,/[id]) + teachers(/new,/[id])
│   │   │             + admissions + parents + users + schedule + communication
│   │   │             + classes + fees(/payment/[studentId]) + grades(/entry)
│   │   │             + attendance(/mark) + calendar + settings
│   │   ├── teacher/  dashboard, classes, communication, attendance,
│   │   │             schedule, assignments, grades
│   │   ├── student/  dashboard, fees, classes, communication, schedule,
│   │   │             assignments, attendance, grades
│   │   └── parent/   dashboard, schedule, progress, fees, attendance,
│   │                 communication, calendar
│   └── shared/{calendar,communication,fees,profile}/    # EMPTY dirs
├── components/
│   ├── layout/   sidebar-nav, top-header, auth-provider
│   ├── admin/    schedule-slot-dialog, class-form-dialog
│   ├── shared/   page-header, stat-card, empty-state, loading-skeleton
│   ├── public/   notice-bar, navbar, footer
│   └── ui/       ~30 shadcn-style + template leftovers (chatbot, map,
│                  floating-dock, marquee, GA/GTM/meta/tiktok/clarity pixels…)
├── data/
│   ├── types.ts                     # 18 domain interfaces (full domain model!)
│   ├── index.ts
│   ├── mock/    users.ts, classes.ts, academics.ts, finance.ts, schedule.ts
│   ├── hooks/   useMockData.ts      # fake-latency hooks over static arrays
│   └── stores/  classStore, scheduleStore, admissionStore (in-memory React contexts)
├── lib/  auth.ts, auth-client.ts, utils.ts, language-context.tsx,
│         data-translations.ts, generated/ (prisma client, gitignored)
├── prisma/  schema.prisma, seed.mjs, migrations/20260523115456_init/
├── public/  template svgs
├── PLAN.md (admission-form feature plan), README.md (create-next-app boilerplate),
│   AGENTS.md (Next-16 warning), CLAUDE.md (11B), .env (real creds!), .gitignore
├── next.config.ts (allows images from r2.shifaul.dev), prisma.config.ts,
├── tsconfig.json, eslint.config.mjs, postcss.config.mjs, srcroot.config.json
```

~50 page.tsx files total.

## Implemented Modules (with paths)

Everything below is **client-side mock** (static TS arrays + simulated 300–400 ms latency via `data/hooks/useMockData.ts`) **except auth**, which is real.

| Module | Paths | Status detail |
|---|---|---|
| **Auth (REAL)** | `app/login/page.tsx` (better-auth `signIn.email`, prefilled demo creds shown on page), `app/register/page.tsx` (`signUp.email` → real DB user, role forced "student", `input:false`), `lib/auth.ts`, `lib/auth-client.ts`, `app/api/auth/[...all]/route.ts` | Session 7d, cookie cache 5m |
| **Role authorization** | `app/middleware.ts` + `proxy.ts` (duplicate): /admin→admin, /teacher→teacher+admin, /student→student, /parent→parent; unauth→/login; /dashboard→role home. Session checked via internal `fetch("/api/auth/get-session")` [fragile pattern]. Client guard in `app/(portal)/layout.tsx` + `components/layout/auth-provider.tsx` (`useSession`) | Route-level only |
| **Students CRUD (UI)** | `app/(portal)/admin/students/page.tsx` (list, search, grade/section filters), `new/page.tsx`, `[id]/page.tsx` (detail+edit) | In-memory only |
| **Teachers CRUD (UI)** | `app/(portal)/admin/teachers/{page,new/page,[id]/page}.tsx` | In-memory only |
| **Admissions workflow (UI)** | `app/(public)/admissions/page.tsx` (627-line 4-step form: student→parent→docs→review), `app/(portal)/admin/admissions/page.tsx` (approve/reject), `data/stores/admissionStore.tsx` | Per PLAN.md; **"not persisted to DB yet"** — the only cross-role business workflow, still session-memory only |
| **Attendance (UI)** | `app/(portal)/admin/attendance/` + `mark/`, `teacher/attendance/`, `student/attendance/`, `parent/attendance/` | Mock `AttendanceRecord` type exists |
| **Grades/Exams (UI)** | `admin/grades/` + `entry/`, `teacher/grades/`, `student/grades/`, `parent/progress/` | Mock `Grade`/`Transcript` types exist |
| **Fees/Billing (UI)** | `admin/fees/` + `payment/[studentId]/`, `student/fees/`, `parent/fees/`, mock finance data | Mock `FeeStructure`/`Payment` types exist |
| **Assignments (UI)** | `teacher/assignments/`, `student/assignments/` | Mock `Assignment`/`Submission` types |
| **Timetable/Schedule (UI)** | `admin/schedule/` + `components/admin/schedule-slot-dialog.tsx`, teacher/student/parent `schedule/`, `data/stores/scheduleStore.tsx`, `data/mock/schedule.ts` | `Timetable`/`TimeSlot` types |
| **Classes (UI)** | `admin/classes/` + `class-form-dialog.tsx`, `teacher/classes/`, `student/classes/`, `data/stores/classStore.tsx` | `Class`/`Subject` types |
| **Communication (UI)** | `*/communication/` per role | Mock `Notification` type |
| **Calendar (UI)** | `admin/calendar/`, `parent/calendar/`, `data/mock/schedule.ts` events | Mock |
| **Admin misc (UI)** | `admin/parents/`, `admin/users/`, `admin/settings/`, dashboards per role (`DashboardStats` type) | Mock |
| **Public site** | `(public)/` home/about/academics/news/contact/pages + navbar/footer/notice-bar | Template-grade, functional |
| **Seed demo users (REAL DB)** | `prisma/seed.mjs` → `admin@guziahs.edu`, `teacher@guziahs.edu`, `student@guziahs.edu`, `parent@email.com`, all `password123` (also displayed on login page) | Auth tables only |

Domain richness worth preserving: `data/types.ts` defines the complete intended model — User, Teacher, Student (grade/section/rollNo/parentId), Parent (studentIds), Class, Subject, TimeSlot, Timetable, Grade, Transcript, AttendanceRecord, Assignment, Submission, FeeStructure, Payment, CalendarEvent, DashboardStats, Notification. Mock datasets: 15 students, 8 teachers, 8 parents, 3 admins + grades/attendance/assignments/payments/events.

## Planned / Stub Modules

- **`app/shared/{calendar,communication,fees,profile}/`** — exist but are **empty directories** (planned shared portal components, never built).
- **`app/forgot-password/page.tsx`** — pure UI stub; submit just flips a "Check Your Email" state; no better-auth `forgetPassword` call, no reset flow.
- **Fake AI chatbot** — `components/ui/chatbot.tsx` labeled "AI Assistant" with hardcoded conversation; no backend, no ML. Template leftover.
- **PLAN.md** (only plan on disk): admission form → done as in-memory store; explicitly defers DB persistence.
- **No persistence layer for domain data** anywhere — mock stores are the "backend".
- Duplicate middleware (`middleware.ts` vs `proxy.ts`) — one is transitional dead weight for Next 16.
- README: untouched create-next-app boilerplate (no project docs, no seed/cred instructions).

## Git Progress Summary

- **Single commit on `main`**: `0aa6a86` "commit (initial): Initial commit from Create Next App" (author khanshifaul). `refs/heads/main` = that same hash; no tags, no packed-refs, no other branches.
- **The entire finished app was committed at once** under the boilerplate initial-commit message — all files share one ~4-month-old mtime. **Zero incremental/meaningful commit history** (fails "meaningful git commits" today; history would need to be rebuilt going forward).
- `.gitignore` covers `.env*`, `/lib/generated/prisma`, node_modules, .next — hygiene OK, but the live-credential `.env` sits untracked on disk and there is **no `.env.example`** to replace it.

## Gap Analysis vs NT Tech Assessment Requirements

| Requirement | Status | Notes |
|---|---|---|
| Responsive frontend | ✅ **Present** | Tailwind v4 responsive layout, collapsible/mobile sidebar (`(portal)/layout.tsx`), all portals styled for md/mobile |
| Working APIs (server) | ❌ **Missing** | Only better-auth's `/api/auth/*`. Zero domain endpoints; zero server actions. Needs full REST or server-action layer for students/teachers/attendance/grades/fees/etc. |
| DB persistence | ❌ **Missing** | Postgres+Prisma wired for auth tables only. Need domain Prisma models (types in `data/types.ts` are the ready blueprint) + migrations + seed of school data |
| CRUD (end-to-end) | ❌ **Missing** | All CRUD UIs mutate in-memory mock stores; nothing survives reload. UI shells for students/teachers/admissions/grades/attendance/fees exist and can be backed |
| Auth | ✅ **Present (with caveats)** | better-auth email/password, 4 roles, real sessions, register+login pages, demo creds seeded & shown. Caveat: forgot-password is a stub; no email verification flow |
| Authorization | ⚠️ **Partial** | Route-level role gates in middleware + client guard. No per-resource checks, no API-level authz (no APIs). Middleware session-fetch pattern is fragile — should use server-side session reads |
| Input validation | ❌ **Missing** | No zod (or any validator) anywhere; forms rely on HTML `required`. Needs schema validation client+server |
| Meaningful business workflow | ⚠️ **Partial** | Admission application→admin approve/reject flow is built end-to-end in UI (627-line multi-step form) but non-persisted. Attendance-marking, grade-entry, and fee-payment flows exist as UI and are strong candidates to make real |
| ONE AI/ML feature (+ inputs/outputs/limits/eval docs) | ❌ **Missing** | The "AI Assistant" chatbot is a canned UI fake. Nothing computes/predicts. Must add a real, small, explainable feature (e.g., at-risk-student flag from attendance+grades, or grade prediction) — `Grade`/`AttendanceRecord` mock data provides ready training/eval material |
| Basic testing of a critical feature | ❌ **Missing** | `@playwright/test` installed but zero tests/config. Add at least one e2e (login+role redirect) or unit test of a critical function |
| Modular code | ⚠️ **Partial** | Front-end is modular (components/data/stores split), but there is no server-side module structure at all; domain logic lives in React contexts. Needs services/repositories layer |
| Meaningful git commits | ❌ **Missing** | One squashed "initial" commit with the entire app |
| README | ❌ **Missing** | create-next-app boilerplate; needs setup/run/seed/creds/architecture docs |
| .env.example | ❌ **Missing** | 4 vars to document: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` (rotate the leaked Neon creds) |
| Demo credentials | ✅ **Present** | `prisma/seed.mjs` seeds 4 role users (`*@guziahs.edu` / `parent@email.com`, password `password123`); login page displays them. Not documented in README; seed script has no npm script and likely a broken import path [INFERENCE] |

### Decision inputs: extend vs start fresh

**What extending buys**: ~50 polished, bilingual, responsive pages across 4 role portals; working real auth (better-auth+Postgres+Prisma already bootstrapped, migrations applied); complete domain type system in `data/types.ts`; an implemented (UI-level) admission workflow; demo seed + demo creds UX; role middleware skeleton.

**What extending costs**: the domain layer must be built from scratch anyway (schema, APIs, persistence, validation — i.e., the assessment's core scoring area), plus AI feature, tests, docs, and git-history rebuild are all additive work regardless. Also carries template bloat to strip: unused DB deps (sqlite/neon adapters, bcryptjs), analytics pixels, leaflet/GSAP, fake chatbot, duplicate `middleware.ts`/`proxy.ts`, empty `app/shared/*` dirs, and Next-16 quirks (AGENTS.md warns conventions changed; verify against `node_modules/next/dist/docs/` before edits).

**Net**: front-end shell = ~70% of UI work done; back-end/assessment-criteria work = ~0% done. Extending is viable only if specs explicitly include building the entire server-side (domain Prisma schema + API/actions + validation + authz + AI + tests + docs) on top of the existing UI; a fresh start is only justified if the assessment also grades architecture/modularity, where the template's mock-data-through-React-contexts pattern would need heavy rework either way.
