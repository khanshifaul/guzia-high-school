# Guzia High School

A school management portal for a real secondary school in Bogura, Bangladesh
(Classes 6–10), plus an AI toolkit that does the work teachers usually do by hand:
question papers, lesson plans, revision material, and answers cited from their own
coursebooks.

Built as the **NT Tech Innovation Full-Stack Developer assessment**.

- **Live:** https://guzia-high-school.vercel.app
- **API:** https://guzia-api.onrender.com (`/api/docs` for Swagger)
- **Repo:** https://github.com/khanshifaul/guzia-high-school

Both run on free tiers, so the first request after a quiet spell takes ~50 seconds to
wake. Deployment details are in [DEPLOY.md](DEPLOY.md).

## Demo logins

Password for every account: `password123`.

| Role | Email |
|---|---|
| Admin | `admin@guziahs.edu` |
| Teacher | `teacher1@guziahs.edu` (MST. MASUDA KHATUN) |
| Student | `student01@guziahs.edu` |
| Parent | `parent01@guziahs.edu` |

The seed mirrors the school: 17 teachers taken from its MPO sheet (`emis.gov.bd`),
50 students (10 per class, 5 per section), 15 parents, 60 days of attendance, two
published exams, fee invoices, notices and pending admission applications.

## Run it locally

Requirements: [Bun](https://bun.sh) 1.4+, and PostgreSQL 18 with pgvector — Docker is the
easiest way to get it. No shell scripts are required; these commands work in any
terminal (on Windows use `Copy-Item` instead of `cp`).

```bash
# 1. database + dependencies
docker compose up -d
bun install

# 2. API (terminal 1)
cd apps/api
cp .env.example .env.local        # Windows: Copy-Item .env.example .env.local
bunx prisma migrate dev
bun run db:seed                   # demo school
bun run ai:train                  # at-risk model + eval report
bun run dev                       # http://localhost:4000  (Swagger /api/docs)

# 3. web (terminal 2)
cd apps/web
cp .env.example .env.local        # API_BASE_URL=http://localhost:4000
bun run dev                       # http://localhost:3004
```

Open http://localhost:3004 and sign in with a demo account.

`scripts/bootstrap.sh` and `scripts/dev.sh` do the same steps on Linux/macOS if you
prefer one command; they are a convenience, not a requirement.

The default provider is a seeded **mock**, so every AI feature works with no API key
and no network. Point it at a real model in **Admin → Settings → LLM Provider**.

## What's inside

- **Admin** — dashboard, students, teachers, classes/sections/subjects, admissions
  (approve → enroll + create the login in one transaction), fees with an oldest-first
  payment waterfall, notices, gallery, site settings, at-risk board.
- **Teacher** — attendance, marks entry, assignments and grading, plus the AI toolkit.
- **Student** — attendance, results (canonical GPA), fees, assignments.
- **Parent** — their child's attendance, results and dues.
- **Public** — homepage, about, admissions form with document upload, news, contact.

One rule, one implementation: every grade on every screen comes from
`exams/grading.util.ts`, and every payment allocation from `fees/waterfall.util.ts`.

## AI features

### At-risk students (self-built model)

A logistic regression trained from scratch (gradient descent, no ML library) on five
features: attendance rate, lateness, GPA trend, assignment submission rate, and overdue
fees. The admin board shows each student's score and the factors that moved it.

Holdout metrics (`test-reports/ai-eval-report.md`, reproduce with `bun run ai:train`):
**accuracy 0.925, precision 0.941, recall 0.762, F1 0.842, ROC-AUC 0.834**.

The labels are synthetic — a noisy hand-written rule over a seeded cohort — so this
proves the method, not a production model. A linear boundary is deliberate: it is
explainable. With real historical outcomes it would be retrained on those.

### Teacher toolkit

An admin-configurable, OpenAI-compatible provider (DeepSeek, OpenAI, Ollama…; key
encrypted at rest, masked in the UI, with a *Test connection* button) powers:

- **Question papers** — blueprint in (MCQ/short/long), structured paper out with options,
  answer key, explanations and difficulty. Publish it and students take it in the portal;
  MCQs auto-grade, written answers go to a grading queue.
- **Lesson plans** — class + subject + weeks → an editable term plan; any week can be
  regenerated with its neighbours as context.
- **Study material** — flashcards and mind maps from the teacher's own sources.
- **Source assistant** — upload a PDF, DOCX, CSV, markdown, image or URL; it is chunked,
  embedded in pgvector and summarised, then answered with page citations. A citation with
  no matching page is dropped.

Everything the model returns is validated against a schema before it is saved, and every
artifact is badged **"AI-generated — verify before use"**.

## Architecture

```
Browser → apps/web (Next.js 16, :3004)  httpOnly cookie session, role middleware
             │ /api/* rewritten to the API
             ▼
          apps/api (NestJS 11, :4000, Swagger /api/docs)
             │ Prisma 7 + @prisma/adapter-pg
             ▼
          PostgreSQL 18 + pgvector
```

Modules live under `apps/api/src/<domain>/`; the web talks to them through one typed
fetch wrapper (`lib/api.ts`). Specs for every feature are in [`specs/`](specs/).

## Tests

```bash
bun run test                         # API: 167 tests
cd apps/api && bun run test:e2e      # 7 e2e (auth, admissions) — API running
cd apps/web && bun run test          # 54 web tests
```

The unit tests guard the business logic (grade-band boundaries, the payment waterfall,
weighted attendance, IDOR access); the e2e suite proves login/role gating and
approve → enroll → log in.

## Environment

Copy `apps/api/.env.example` and `apps/web/.env.example`. Required: `DATABASE_URL`,
`JWT_SECRET` (32+ chars), `AI_CONFIG_SECRET` (encrypts the stored provider key), and
`API_BASE_URL` on the web. Everything else is optional and documented in the examples.

## Known limits

- Payments are recorded by the admin; there is no gateway integration.
- Email is wired to Resend but optional; without a key, receipts show on screen.
- The at-risk model uses synthetic labels; retraining on real outcomes is the next step.
- Free hosting sleeps: warm the API before a demo.
