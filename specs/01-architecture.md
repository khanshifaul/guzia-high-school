# 01 — Architecture

## Shape

Bun-workspace monorepo (zylosync pattern, simplified for one school + one frontend):
a NestJS modular-monolith API and a single Next.js portal. **No shared package** —
the portal consumes the API's OpenAPI spec to generate its types (openapi-typescript).

```
Browser ──► apps/web  (Next.js 16, :3000, orange design system)
              │  fetch /api/*  (rewrite → API_BASE_URL, httpOnly JWT cookie forwarded)
              ▼
           apps/api  (NestJS 11, :4000, Swagger at /api/docs)
              │  Prisma 7 + @prisma/adapter-pg
              ▼
           PostgreSQL 18 (docker compose, :5432)
```

## Tech stack (versions = zylosync latest, declared ranges)

| Layer | Choice | Version |
|---|---|---|
| Runtime / workspaces | Bun (`workspaces: ["apps/*"]`, single `bun.lock`) | node engine `>=20` |
| API framework | NestJS (`@nestjs/core`, `@nestjs/platform-express`) | `^11.1.12` |
| Language | TypeScript | `^5.9.3` |
| ORM | Prisma + `@prisma/client` + `@prisma/adapter-pg` | `^7.8.0` |
| Database | PostgreSQL (compose image) | `postgres:18-alpine` |
| PG driver | `pg` | `^8.21.0` |
| API style | REST controllers + Swagger (`@nestjs/swagger`) | `^11.2.5` |
| Validation (server) | class-validator DTOs + class-transformer; Joi for env | `^0.14.3` / `^0.5.1` / `^18.0.2` |
| Auth | passport-local (login) + passport-jwt (guard) + `bcryptjs`; JWT in httpOnly cookie | `passport ^0.7.0`, `passport-jwt ^4.0.1`, `@nestjs/jwt ^11.0.2`, `bcryptjs ^3.0.3` |
| Frontend | Next.js App Router | `^16.2.6` |
| React | pinned exact (no caret) | `19.2.3` |
| Next middleware | `proxy.ts` (Next 16 convention — NOT `middleware.ts`) | — |
| Styling | Tailwind CSS 4 CSS-first (`@theme inline` in globals.css) + CVA + clsx + tailwind-merge | `tailwindcss ^4`, `cva ^0.7.1`, `tailwind-merge ^3.6.0` |
| Client validation | zod | `^4.3.5` |
| Theme | next-themes (class strategy) | `^0.4.6` |
| Animation / icons | motion, react-icons (Fa* + Fi*) | `motion ^12.38.0`, `react-icons ^5.6.0` |
| Charts | recharts | `^3.8.1` |
| Dates | date-fns | `^4.1.0` |
| API client types | openapi-typescript → `types/guzia-api.d.ts` | `^7.13.0` |
| i18n | custom EN/BN context (alumni-app pattern) | — |
| API tests | Jest 30 + ts-jest + supertest | `jest ^30.2.0`, `supertest ^7.2.2` |
| Web unit tests | Vitest 4 + happy-dom | `^4.1.11` |
| Lint/format | oxlint (root + per-app), oxfmt | `oxlint ^1.78.0`, `oxfmt ^0.63.0` |

Dropped from zylosync deliberately (enterprise extras, out of assessment scope):
RabbitMQ, Redis, MinIO/S3, Sentry, Socket.IO, read-replicas, multi-schema tenancy,
SAML/OAuth/2FA, serwist PWA, next-intl, k8s. Auth is cookie-JWT only.

## API app module layout (zylosync pattern)

```
apps/api/src/
├── main.ts                # bootstrap, global ValidationPipe, Swagger at /api/docs
├── app.module.ts
├── common/                # prisma.module (+service), http-exception filter, cookie util
├── config/                # env.ts (Joi-validated), config module
├── auth/                  # auth.module, auth.controller (login/me/logout),
│                          # auth.service, jwt.strategy, roles.guard, roles.decorator, current-user.decorator
├── users/                 # user entity service (seed-managed; minimal)
├── students/              # student.{module,controller,service}.dto/ + .spec.ts
├── teachers/
├── classes/               # classes + sections + subjects (academic structure)
├── attendance/            # marking + queries + weighted-% helper
├── exams/                 # exams, marks entry, GPA computation, grade bands
├── assignments/           # assignments + submissions
├── fees/                  # fee heads, invoices, payments, waterfall allocation
├── admissions/            # public application submit + admin review workflow
├── notices/
└── ai/                    # at-risk classifier: model.ts, scoring.service.ts,
                           # train.ts script, model/at-risk-model.json, ai.controller
```

Every domain: `<domain>.module.ts` + `<domain>.controller.ts` (Swagger-decorated,
Roles-guarded) + `<domain>.service.ts` (ALL Prisma access) + `dto/` with
class-validator DTOs + co-located `<file>.spec.ts`.

## Web app layout

```
apps/web/
├── proxy.ts                        # Next 16 middleware: session check via /api/auth/get-session, role redirect
├── app/
│   ├── layout.tsx  globals.css     # tokens (from alumni-app), ThemeProvider, LanguageProvider
│   ├── (public)/                   # navbar shell: page.tsx, admissions/ (multi-step form), login/
│   └── (portal)/                   # w-72 sidebar shell (session-gated):
│       ├── layout.tsx              #   useSession gate → /login; role nav config
│       ├── admin/                  #   dashboard, students, teachers, classes, admissions,
│       │                           #   grades, attendance, fees, notices, at-risk, settings
│       ├── teacher/                #   dashboard, classes/[id], attendance/mark, grades/entry,
│       │                           #   assignments, schedule, notices
│       ├── student/                #   dashboard, attendance, grades, fees, assignments, notices
│       └── parent/                 #   dashboard, children/[id], fees, notices
├── components/  ui/ (hand-rolled shadcn kit, portal/ nav shells, shared/ page-header, stat-card,
│                empty-state, loading-skeleton, status-banner)
├── lib/         api.ts (typed fetch wrapper), api-client types (generated), auth-client.ts,
│                language-context.tsx, data-translations.ts, zod-schemas/
├── hooks/       use-*.ts
└── types/       guzia-api.d.ts   # GENERATED — never hand-edited
```

State: no React Query/Zustand. Pages are client components calling the typed fetch
wrapper in `useEffect`; server-side revalidation is unnecessary (API is source of
truth; `router.refresh()` after mutations). This mirrors alumni-app exactly.

## Key decisions

| Decision | Rationale |
|---|---|
| Fresh build, don't extend MyLab repo | Old repo: single squashed commit, better-auth coupling, all domain logic in React contexts, template bloat (analytics pixels, fake chatbot, unused DB adapters). Fresh = clean git history (a graded criterion) + zylosync conventions from line 1. Page blueprints still mined from it. |
| NestJS REST + generated client (not Next server actions) | User mandate: zylosync stack/structure. Bonus for assessment: Swagger at `/api/docs` is demo-able proof of "working APIs"; typed contract via openapi-typescript shows engineering rigor. |
| Cookie JWT (not better-auth / not bearer in localStorage) | zylosync auth shape scaled down: httpOnly cookie = XSS-safe storage; passport-jwt + RolesGuard = explainable in live review. |
| Single canonical grade scale in `exams/` | School-management shipped 4 divergent scales — this is the #1 mined lesson. One module owns bands + GPA; every screen reads its output. |
| Payment waterfall (allocate oldest-first) | Mined from School-management `payment/success/route.ts` — genuinely non-trivial business logic worth 20 backend marks; unit-tested. |
| AI = self-built logistic regression in TS | Assessment allows self-built models; no API key dependency; fully explainable (weights × features); train/eval reproducible offline via `bun run ai:train`. DeepSeek-chat recommended exactly this for a 2-day sprint. |
| At-risk, not chatbot/summaries | Uses data the app already has (attendance, marks, submissions); visible on admin dashboard = instant demo; honest limitations to discuss in review. |
| Teacher toolkit LLM = admin-configured OpenAI-compatible provider (spec 10) | Admin picks provider/base URL/models/key in DB (env seeds boot defaults); one `openai` SDK covers DeepSeek/OpenAI/Groq/local Ollama/Gemini-compat; mock provider keeps tests + offline demo green; key encrypted at rest, masked in UI |
| Postgres via docker compose only | zylosync profile `infra` pattern: `docker compose --profile infra up -d`, apps run on host via bun. Neon not required; compose pins PG 18. |

## Request flows

**Login:** web `/login` → POST `/api/auth/login` {email,password} → API bcrypt-compares,
signs JWT {sub, role}, sets httpOnly cookie `ghs_token` (7d) → web proxy.ts sees session
on next nav → role redirect (`/admin`, `/teacher`, `/student`, `/parent`).

**Guarded write (e.g. attendance mark):** teacher page → `lib/api.ts` POST
`/api/attendance/mark` with cookie → controller `@UseGuards(JwtAuthGuard, RolesGuard)`
`@Roles(TEACHER, ADMIN)` → DTO validated (class-validator) → service upserts
`AttendanceRecord` (unique [studentId,date]) → 201 → web shows inline success banner.

**AI recompute:** admin "Recompute risk" → POST `/api/ai/at-risk/recompute` (ADMIN only)
→ scoring service loads model JSON, computes features per enrolled student (last 60
school days attendance, last 3 exam GPAs slope, assignment submission rate, overdue fee
ratio) → sigmoid → persists `AtRiskScore` rows → admin board GETs list sorted by score desc.
