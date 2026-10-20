# Guzia High School — Management Portal

A full-stack school-management system for Guzia High School (grades 6–10): students,
teachers, attendance, canonical GPA grading, fee ledgers with a payment waterfall,
an admission workflow, and **two AI features** — a self-built at-risk classifier and
an admin-configured teacher AI toolkit.

Built as the **NT Tech Innovation Full-Stack Developer assessment**.

**Live demo:** https://guzia-high-school.vercel.app ·
**API:** https://guzia-api.onrender.com (`/api/docs`) — both are free instances, so the
first request after a quiet period takes ~50 s to wake. See [`DEPLOY.md`](DEPLOY.md).

## Stack

| Layer | Choice |
|---|---|
| Monorepo | Bun workspaces (`apps/*`), single `bun.lock` |
| API | NestJS 11 + Prisma 7 + PostgreSQL 18 (Docker), port 4000 |
| Web | Next.js 16 App Router + React 19.2.3 + Tailwind 4, port 3004 |
| UI kit | `@srcroot/ui` components (copied into `apps/web/components/ui/`) |
| Auth | JWT in httpOnly cookie (`ghs_token`), passport-jwt + RolesGuard |
| AI | Self-built logistic regression (at-risk) + OpenAI-compatible LLM toolkit |
| Tests | Jest 30 + supertest (API unit + e2e) |

## Quick start

```bash
git clone <repo> && cd guzia-high-school
./scripts/bootstrap.sh        # install, start Postgres, migrate, seed, train AI model
./scripts/dev.sh              # run API (:4000) + web (:3004) together
bun run start            # run API (:4000) + web (:3004) from build output (requires `bun run build` first)

```

Then open http://localhost:3004 and sign in with a demo account.

<details>
<summary>Manual setup (step by step)</summary>

```bash
docker compose up -d                 # PostgreSQL 18 on :5434
bun install

# API
cd apps/api
cp .env.example .env.local           # set DATABASE_URL, JWT_SECRET, AI_CONFIG_SECRET
bunx prisma migrate dev              # create schema
bun run db:seed                      # demo dataset (deterministic)
bun run ai:train                     # train at-risk model → model JSON + eval report
bun run dev                          # http://localhost:4000  (Swagger: /api/docs)

# Web (second terminal)
cd apps/web
cp .env.example .env.local           # API_BASE_URL=http://localhost:4000
bun run dev                          # http://localhost:3004
```
</details>

Other scripts: `scripts/seed-reset.sh` (reseed + retrain),
`scripts/api-tests/run-tests.sh` (unit + e2e), `scripts/check-docs-links.mjs`,
`infrastructure/postgres/backup.sh`. See `scripts/README.md`.

## Demo credentials

All passwords are `password123`.

| Role | Email |
|---|---|
| Admin | `admin@guziahs.edu` |
| Teacher | `teacher1@guziahs.edu` (MST. MASUDA KHATUN), `teacher2`, `teacher3` |
| Student | `student01@guziahs.edu` (also `student02` … `student30`) |
| Parent | `parent01@guziahs.edu` (also `parent02` … `parent15`) |

The seed creates a realistic dataset: 5 classes, 30 students in Class 8-A, 17 teachers
taken from the school's MPO sheet (`emis.gov.bd`), 15 parents, 60 days of attendance
(with 3 deliberately weak students for the AI demo), two published exams with marks,
fee invoices, notices, and pending admission applications.

## Demo walkthrough

1. **Admin** → Dashboard (stats + at-risk mini-board) → **At-Risk Board** → *Recompute
   Scores* → 3 seeded weak students get flagged (HIGH, ~95%) with attendance as the top
   factor. **Settings** shows the LLM provider panel with *Test connection*.
2. **Admin** → **Admissions** → approve a pending application → a student is enrolled and
   a generated password is shown once.
3. **Teacher** → **Attendance** → pick a section, set P/A/L, submit. → **Grades** →
   pick exam + subject, enter marks (validated 0–100). → **AI Tools**: generate a lesson
   plan or a test paper (works offline via the mock provider).
4. **Student** → Dashboard (attendance %, CGPA, dues) → **Grades** (canonical letters/points)
   → **Fees** (ledger) → **Assignments** (submit work).
5. **Admin** → **Fees** → search a student → *Record Payment* → the amount clears the
   oldest invoices first (waterfall) and the ledger updates.

## Architecture

```
Browser ──► apps/web  (Next.js 16, :3004)   cookie session, role middleware (proxy.ts)
              │  /api/*  rewritten to the API
              ▼
           apps/api  (NestJS 11, :4000, Swagger at /api/docs)
              │  Prisma 7 + @prisma/adapter-pg
              ▼
           PostgreSQL 18 (docker compose, :5434)
```

- **One canonical grading implementation** (`apps/api/src/exams/grading.util.ts`).
  Every GPA/CGPA/letter on every screen comes from it — no screen recomputes grades.
- **Payment waterfall** (`apps/api/src/fees/waterfall.util.ts`): a payment clears the
  student's open invoices oldest-dueDate-first; partial coverage marks an invoice PARTIAL.
- **Admission approve → enroll** runs in a transaction: creates the student **and** their
  login atomically.
- Modules live under `apps/api/src/<domain>/` (module/controller/service/dto +
  co-located tests). The web app talks to it via a typed fetch wrapper (`lib/api.ts`).

## AI features

The assessment requires **one** practical AI feature with explained inputs, outputs,
limitations, and evaluation. This project includes two, each documented in full.

### 1. At-risk student classifier (self-built ML)

`apps/api/src/ai/` — a **logistic regression trained from scratch** (gradient descent,
no ML libraries). Prediction: `P(at-risk) = σ(Σ wᵢ·zᵢ + b)` on standardized features.
Fully explainable — each feature's contribution to a prediction is `wᵢ·zᵢ`.

**Inputs** (5 engineered features, all 0–1, higher = safer):

| Feature | Reads from |
|---|---|
| `attendanceRate` | weighted attendance % (present=1, late=0.5) over the last 60 school days |
| `invLateRate` | 1 − late rate |
| `gpaTrend` | squashed slope of published-exam averages |
| `submissionRate` | on-time submissions / assignments due (60d) |
| `invOverdueFee` | 1 − overdue-fee ratio |

**Output:** a risk score 0–1, a boolean flag at the decision threshold, and the top-3
contributing factors (shown on the admin At-Risk Board as `attendance ↓`, `submissions ↑`, …).

**Evaluation** (`test-reports/ai-eval-report.md`, reproducible via `bun run ai:train`):

| Metric | Holdout |
|---|---|
| Accuracy | 0.925 |
| Precision | 0.941 |
| Recall | 0.762 |
| F1 | 0.842 |
| ROC-AUC | 0.834 |

Trained on a **synthetic cohort** (400 students from a seeded RNG) labeled by a noisy
hand-written rule with 8% flips to simulate labeling noise. This is stated plainly: with
real historical pass/fail outcomes, the model would be retrained on those instead.

**Limitations (honest):** synthetic labels (the model can only recover what the labeling
rule captures); a linear decision boundary; the features encode the domain knowledge, so
poor instrumentation → poor model; batch scoring, not real-time; sensitive to data
quality (unmarked attendance skews rates).

**Usefulness check:** the seed's three weak students (poor attendance + missing
submissions + falling GPA) are all flagged HIGH — demonstrated live, not just claimed.

### 2. Teacher AI toolkit (LLM)

`apps/api/src/ai/` — three teacher-facing features on an **admin-configured,
OpenAI-compatible LLM** (DeepSeek, OpenAI, Groq, local Ollama…):

- **Lesson-plan generator** — class + subject + weeks → an editable year/term plan. The
  LLM returns topics/objectives only; the server computes week dates (skipping Fridays).
- **Test-paper generator** — a blueprint (MCQ/short/long counts, marks, duration) → a
  grouped, editable question paper with an answer key. The server assigns per-question
  marks and enforces the total.
- **Source-grounded assistant** — upload text → chunked + summarized; ask questions with
  page citations (keyword retrieval, top-k chunks → LLM).

**Admin controls the provider** (Settings → LLM Provider): base URL, text/vision models,
API key (write-only, AES-256-GCM-encrypted at rest, masked in the UI), temperature, and
an enable kill-switch — with a **Test connection** button. Config applies within 60s,
no restart. A **mock provider** (the seeded `AiProviderConfig` row) keeps tests and the demo
fully offline.

**Limitations:** AI-generated plans and papers are drafts — the UI badges them
"AI-generated — verify before use"; retrieval uses pgvector embeddings over the ingested
source chunks; the teacher reviews every artifact before use.

## Testing

```bash
cd apps/api
bun run test        # 136 unit tests: grading boundaries, payment waterfall, attendance %, IDOR access
bun run dev &       # API must be running
bun run test:e2e    # 7 e2e tests: auth (login, role gating) + admission workflow
```

The unit tests protect the three business-logic cores (canonical grading incl. band
boundaries, oldest-first payment waterfall, weighted attendance). The e2e suite proves
the auth flow and the admission-approve-enrolls-then-can-log-in workflow end to end.

## Environment variables

See `apps/api/.env.example` and `apps/web/.env.example`. Required:

| Var | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Signs session tokens (≥ 32 chars) |
| `AI_CONFIG_SECRET` | Encrypts the stored LLM API key (AES-256-GCM) |
| `API_BASE_URL` | (web) where the API lives |

Optional AI boot defaults: `AI_PROVIDER` (`deepseek` | `mock`), `DEEPSEEK_API_KEY`,
`DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL`, `GEMINI_API_KEY`. These only
seed the first `AiProviderConfig` row; runtime truth lives in the database and is edited
in the admin UI.

Provider resolution order (first usable wins): **mock provider row → DB row with a
stored key → `KILO_*` env fallback → keyless DB row → 503**. The `KILO_*` vars (`KILO_GATEWAY_URL`, `KILO_MODEL`,
`KILO_API_TOKEN`) point at any OpenAI-compatible gateway (default `kilo-auto/free`);
they let the toolkit serve a **real** LLM without any admin configuration. Leave them
unset (and keep the seeded mock provider row) to keep the demo fully offline.

## Known limitations & future work

- Payments are recorded manually by the admin (no gateway integration).
- Source ingestion accepts pasted text and file uploads (PDF, DOCX/PPTX, CSV, markdown,
  images via vision transcription, and web URLs).
- Email delivery ships via Resend (admission acknowledgement, grade and fee notices);
  SMS, a timetable builder UI, report-card PDF export, multi-tenancy, and i18n beyond
  EN/BN remain in the post-assessment backlog.
- The at-risk model is trained on synthetic labels; retraining on real outcomes is the
  natural next step.

## Repository

Git history uses conventional commits, one per completed phase. See `specs/` for the full
specification set and `research/` for the analysis of the reference projects this was
designed from (alumni-app design, zylosync structure/stack, and three open-source school
systems mined for features).
