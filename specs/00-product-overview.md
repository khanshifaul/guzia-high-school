# 00 — Product Overview

## Problem

A small high school (grades 6–10) runs on paper and spreadsheets: admission forms,
attendance registers, hand-calculated GPA report cards, fee ledgers. Staff re-enter the
same data in multiple places; parents have no visibility; "who is at risk of failing"
is discovered at results time, too late to intervene.

**Product:** a single-tenant, single-school management portal where admin, teachers,
students, and parents share one database of truth — with one practical AI feature
(at-risk early warning) that surfaces struggling students months before results.

## Users & roles

| Role | Count (demo) | Primary jobs |
|---|---|---|
| **admin** | 1 | Manage students/teachers/classes/subjects, review admissions, publish notices, view AI risk board, manage fees structure |
| **teacher** | 3 | Mark attendance, enter exam marks, create/grade assignments, view own class rosters |
| **student** | 15 | View own attendance/results/fees, submit assignments |
| **parent** | 8 | View children's attendance/results/fees, read notices |

All UI bilingual EN/BN (context dictionary, alumni-app pattern). Currency BDT (৳).

## Assessment rubric → where it is satisfied

| Criterion (per PDF) | Satisfied by |
|---|---|
| Frontend & UX (responsive, loading/success/error states) | specs/03 design system; skeleton loaders, inline status banners, empty states on every page |
| Backend, APIs & business logic | specs/05 REST API (NestJS), specs/06 business logic (grading, attendance %, payment waterfall, admission→enrollment transaction) |
| Database & data handling | specs/04 Prisma schema, FK relations, migrations, seeded demo dataset, input validation on every write |
| Authentication & security | JWT (passport-local + passport-jwt), bcrypt password hashing, RolesGuard + resource-ownership checks, class-validator DTOs, httpOnly cookie |
| AI/ML feature & explanation | specs/07 at-risk classifier: self-built logistic regression, documented inputs/outputs/limitations, holdout evaluation report; specs/10 teacher AI toolkit (plans/tests/sources) + admin-controlled provider config, both with eval stories |
| Code quality, testing & git | specs/08 Jest unit + supertest e2e tests for critical logic; conventional commits per phase (specs/09) |
| Problem solving & planning | this spec set + phased delivery plan |
| Live demonstration & technical review | seeded demo credentials, Swagger at `/api/docs`, README with setup + AI explanation |

## Scope — IN (MVP for 19 Oct deadline)

1. Auth: login (email + password), JWT session, role-based route + API guards, logout.
2. Admin: students CRUD, teachers CRUD, classes/sections/subjects CRUD, admission
   application review (approve → creates enrolled student), notices CRUD, fee-head
   management + invoice generation, at-risk dashboard panel.
3. Teacher: class roster, attendance marking (per class per date, P/A/L), exam marks
   entry, assignments create + grade submissions.
4. Student/parent: read-only dashboards — attendance %, results with canonical GPA/CGPA,
   fee ledger with pay-record action (admin records payment; no real gateway), own
   assignments + submit.
5. Academics: exam → marks → grade band → GPA/CGPA computation (single canonical 4.0-scale).
6. AI (ML): at-risk classifier recompute endpoint + admin board showing flagged students,
   risk score, top contributing factors; training script + evaluation report committed.
6b. AI (teacher toolkit, specs/10): year/term plan generator, test-paper generator,
   source-grounded assistant (PDF/image upload → summarize/ask/→test) — all on an
   **admin-controlled OpenAI-compatible LLM provider** (settings UI; key masked+encrypted;
   test-connection; DeepSeek/OpenAI/Groq/local Ollama supported; mock provider for tests).
7. Ops: bun-workspace monorepo, docker-compose Postgres, `.env.example`, seed script,
   README, Jest tests for grading + waterfall + AI scoring + one e2e (login → role redirect),
   conventional git history.

## Scope — OUT (post-assessment backlog)

- Payment gateway (SSLCommerz/Stripe) — payments are recorded manually by admin.
- Email/SMS delivery, file uploads (documents/photos) — forms capture data only.
- Timetable builder UI (schema supports it; no page in MVP).
- Multi-tenant/multi-branch, SSO/2FA, PWA, i18n for locales beyond EN/BN.
- Report-card PDF export (screen view only).

## Success criteria for submission

- `docker compose up -d && bun install && bun run db:seed && bun run dev` brings up API + web.
- All four demo logins work and land on role-correct dashboards with real DB-backed data.
- Admin can approve an admission → student appears in roster with login.
- Teacher marks attendance → student/parent see weighted % update.
- Teacher enters marks → GPA/CGPA computed per canonical scale, shown everywhere consistently.
- Admin records a fee payment → oldest invoices cleared first (waterfall), balances correct.
- At-risk board lists flagged students with scores; README documents model, inputs, limits, eval.
- Teacher generates an editable year plan and test paper from the AI panel; uploads a
  chapter PDF/image → summary + ask-with-citations; admin switches/tests the LLM
  provider (base URL/model/key) in settings without restart; `AI_MOCK=true` demo runs offline.
- `bun run test` passes with unit tests on the three business-logic cores + AI scoring.
