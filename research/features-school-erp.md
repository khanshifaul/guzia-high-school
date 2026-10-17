# school-erp — Feature Analysis (Idea Mining)

**Stack (1 line):** Next.js 16.2.4 + React 19.2.4 + Tailwind v4 + shadcn/radix frontend; NestJS 11 + TypeORM 0.3.28 + PostgreSQL backend — BUT the school domain is only designed on paper (see verdict).

## Critical context: what is actually implemented

| Layer | Reality |
|---|---|
| Backend domain | **Zero school entities.** Only NestJS starter modules: `cats` (TypeORM CRUD) and `tasks` (repo-pattern CRUD, uuid PK, enum status). `backend/src/modules/` contains nothing else. |
| Backend auth | **None.** `JWT_SECRET`/`JWT_EXPIRES_IN` env vars + `jwt.config.ts` namespace exist and Joi validates them, but no `@nestjs/jwt`/passport package is installed and no auth module/guard exists. |
| Backend validation | ✅ Real: global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` + Joi env schema with custom `optionalTcpPort` validator (`backend/src/main.ts`, `backend/src/config/env.validation.ts`). |
| Multi-tenancy | Aspirational only: `main.ts` logs "Schema-per-tenant", `.env.example` has `DATABASE_NAME=multitenant_db`, `cats.http` sends `X-Tenant-ID` header — no tenant code anywhere. |
| Frontend feature pages | **All placeholders.** Every route under `/dashboard/*` renders one catch-all page (`frontend/src/app/(dashboard)/dashboard/[...slug]/page.tsx`) showing "This area is ready for your school ERP features." |
| Frontend modules dir | `frontend/src/modules/{attendance,auth,class,exam,fee,hostel,library,notification,parent,payroll,report,result,settings,student,teacher,timetable,transport,user}/index.tsx` — **all 18 files are empty (0 bytes)**. `src/types/{user,api,common}.ts` also empty. |
| Dashboard home | Junk: `dashboard/page.tsx` is 31 repeated `<h1>Dashboard</h1>` lines. Profile page: `<div>ProfilePage</div>`. Login/signup pages: empty files. |
| Tests | One starter e2e "Hello World" test (`backend/test/app.e2e-spec.ts`) + `app.controller.spec.ts`. No domain tests. |

## Feature Inventory (the designed vision — mine this for scope)

Source of truth: `doc/menu-structure.md` + `doc/features.md` + typed data in `frontend/src/app/(dashboard)/_components/sidebar-nav.tsx` (`sidebarNavCategories`, ~100 routes, 8 sidebar categories with accent colors: Dashboard=violet, Academics=emerald, People=blue, Operations=orange, Campus=cyan, Communication=yellow, Administration=zinc, Support=sky).

- **Dashboard**: Overview, Analytics, Reports (academic / attendance / finance / hr / transport / custom / data-export)
- **Academics**
  - Admissions: inquiries/leads, applications, enrollment, document verification, waiting list, scholarship applications
  - Programs & teaching: classes/sections, subjects, curriculum, lesson plans, timetable, homework, online classes, study materials
  - Attendance: mark, reports, leave requests
  - Examinations: schedule, marks entry, grades & GPA, report cards, transcripts, result publish, certificates
  - Assignments: create, submissions, gradebook
- **People**
  - Students: directory, admission records, profiles, attendance, discipline/behavior, health records, ID cards, promotions/transfers, alumni
  - Parents: directory, portal access, meetings, consent forms
  - Staff & HR: directory, teachers, departments, designations, attendance, leave, payroll, performance reviews, recruitment
- **Operations**
  - Finance: fee structure, discounts/waivers, scholarships, invoices, payments, due collection, refunds, expenses, budgeting, accounting ledger, financial reports
  - Events: calendar, school events, holidays
- **Campus Services**
  - Transport: vehicles, routes, stops, transport fees
  - Library: books, categories, issue/return, fines
  - Hostel: rooms, allocations, fees
  - Inventory: assets, stock items, purchase orders, suppliers
  - Cafeteria; Security / Gate Pass
- **Communication**: announcements, messages, email campaigns, SMS/WhatsApp, push notifications, notice board, outreach CRM; parent engagement (meetings, progress sharing)
- **Administration**: school setup (branches, profile, academic years, terms, departments); users & access (users, roles & permissions, audit logs); integrations (payment gateways, SMS/email providers, video conferencing, LMS, API keys/webhooks); system (workflow automation, custom fields, templates, backup, subscription billing, settings)
- **Support**: help center, tickets, product updates
- **`doc/features.md` adds (beyond the menu):** biometric/RFID attendance, GPS bus tracking, hostel visitor logs, AI performance analytics + chatbot, alumni donations, multi-branch data sync, LMS (live classes/quizzes), GDPR compliance, mobile apps.

## Notable Business Logic

**None exists.** No fee late-fine calculation, no grade/GPA computation, no timetable conflict detection, no attendance-percentage rules anywhere in the code. The only non-starter logic worth noting:

- Custom Joi port validator `optionalTcpPort` (accepts empty, validates 1–65535, converts to int) — `backend/src/config/env.validation.ts`
- Config namespace pattern: `configLoaders` array + `RootConfig` type, add-a-file-and-append (`backend/src/config/index.ts`)
- TypeORM bootstrapping: `autoLoadEntities: true`, `synchronize: !isProduction` (`backend/src/database/database.module.ts`)
- `TasksRepository.findAllOrdered()` — the only repository customization (tasks module)

## Reusable assets (if cloning patterns)

- Typed 3-level nav model `NavCategory → NavMenuEntry → NavSubmenuItem` with search filter in `nav-main.tsx`
- Landing page sections (hero, features, pricing, FAQ, testimonials, CTA) in `frontend/src/app/(main)/_components/`
- Stack pins worth noting: `antd@^6.3.7` AND radix/shadcn both installed (redundant), `zod@^4.3.6`, `recharts@^3.8.0`, `@dnd-kit/*`, `@tanstack/react-query@^5`, `sonner`, `next-themes`, `babel-plugin-react-compiler`; backend `class-validator@^0.15.1`, `joi@^18.1.2`, `pg@^8.20.0`

## Quality verdict

One line: **A well-documented IA/vision skeleton (~100 designed routes, zero implemented school features) — mine its menu taxonomy and doc structure, not its code.**
