# 02 — File Structure & Conventions

Exact tree to scaffold (zylosync conventions, school-sized). Kebab-case everywhere.

```
guzia-high-school/
├── package.json                    # workspaces: ["apps/*"]; root scripts (dev, build, test, lint, db:migrate, db:seed, ai:train, generate:api)
├── bun.lock                        # single lockfile
├── docker-compose.yml              # postgres:18-alpine, port 5432, healthcheck, volume ghs-pgdata
├── .gitignore                      # .env*, node_modules, dist, .next, prisma/generated, test-report/
├── .oxlintrc.json                  # root lint config (typescript plugin)
├── AGENTS.md                       # permanent conventions (env rules, ports, module pattern, commit rules)
├── README.md                       # setup, demo credentials, architecture, AI explanation, limitations
├── .env.example                    # committed template, every var tagged [REQUIRED]/[OPTIONAL]
├── specs/                          # this spec set
├── plans/01-build-phases.md        # phase checklist with dates
├── test-reports/                   # committed evaluation outputs (ai-eval-report.md)
│
└── apps/
    ├── api/                        # @guzia/api — NestJS 11, port 4000
    │   ├── package.json            # jest config inline; scripts: db:migrate, db:seed, ai:train, start:dev
    │   ├── tsconfig.json           # nodenext, ES2023, decorators ON, strict
    │   ├── nest-cli.json
    │   ├── .env.example  .env.local (gitignored)
    │   ├── prisma/
    │   │   ├── schema.prisma       # client gen → "generated" (cjs), gitignored
    │   │   ├── generated/
    │   │   ├── migrations/
    │   │   └── seed.ts             # demo dataset + 4 role logins
    │   ├── src/
    │   │   ├── main.ts  app.module.ts
    │   │   ├── common/             # prisma.module.ts, prisma.service.ts,
    │   │   │                       # http-exception.filter.ts, cookie.util.ts
    │   │   ├── config/             # env.ts (Joi), config.module.ts
    │   │   ├── auth/               # auth.{module,controller,service}.ts, jwt.strategy.ts,
    │   │   │                       # roles.guard.ts, roles.decorator.ts, current-user.decorator.ts,
    │   │   │                       # dto/login.dto.ts, *.spec.ts
    │   │   ├── users/  students/  teachers/  classes/  attendance/
    │   │   ├── exams/  assignments/  fees/  admissions/  notices/
    │   │   │   # each: <domain>.{module,controller,service}.ts + dto/ + *.spec.ts (co-located)
    │   │   └── ai/
    │   │       ├── model.ts                    # LogisticRegression: train/predict/serialize (spec 07)
    │   │       ├── at-risk.service.ts          # feature extraction + scoring + persistence
    │   │       ├── ai.controller.ts            # at-risk endpoints + provider-config admin API
    │   │       ├── provider-config.service.ts  # AiProviderConfig CRUD, AES key, test-connection (spec 10)
    │   │       ├── llm/                        # llm.service, openai-compatible client, mock provider, __fixtures__/
    │   │       ├── plans/ tests/ sources/      # teacher toolkit modules (spec 10): plan, paper, rag-lite
    │   │       ├── train.ts                    # standalone: train on seed history → model JSON + eval report
    │   │       ├── at-risk.service.spec.ts     # scoring edge cases (+ llm + provider-config specs)
    │   │       └── model/at-risk-model.json    # committed weights + feature order + threshold
    │   └── test/                   # *.e2e-spec.ts (supertest): auth.e2e-spec.ts, admissions.e2e-spec.ts
    │
    └── web/                        # @guzia/web — Next.js 16, port 3000
        ├── package.json            # react pinned 19.2.3 (no caret)
        ├── next.config.ts          # rewrites: /api/:path* → ${API_BASE_URL}/api/:path*
        ├── proxy.ts                # Next 16 middleware (NOT middleware.ts)
        ├── vitest.config.ts
        ├── .env.example  .env.local (gitignored)
        ├── app/
        │   ├── layout.tsx  globals.css  global-error.tsx
        │   ├── (public)/           # page.tsx, login/, admissions/
        │   └── (portal)/           # layout.tsx (session gate + sidebar) + admin/ teacher/ student/ parent/
        ├── components/
        │   ├── ui/                 # hand-rolled shadcn kit (from alumni-app: button, card, input,
        │   │                       # badge, table, dialog, dropdown-menu, skeleton, empty-state,
        │   │                       # status-banner, theme-switcher, …) — copy verbatim, prune unused
        │   ├── portal/             # sidebar-nav.tsx, top-header.tsx, role-nav.ts
        │   └── shared/             # page-header.tsx, stat-card.tsx, data-table.tsx, form-card.tsx,
        │                           # confirm-modal.tsx, pagination.tsx
        ├── lib/
        │   ├── api.ts              # typed fetch wrapper (credentials: 'include', error → banner)
        │   ├── auth-client.ts      # useSession hook → GET /api/auth/me
        │   ├── language-context.tsx  data-translations.ts
        │   └── zod-schemas/        # form schemas mirroring API DTOs
        ├── hooks/                  # use-students.ts, use-attendance-marking.ts, …
        ├── types/guzia-api.d.ts    # GENERATED via openapi-typescript
        └── e2e/                    # optional: portal.spec.ts (Playwright smoke)
```

## Naming rules (non-negotiable, from zylosync AGENTS.md)

- Files/folders: kebab-case. Backend classes match file: `attendance.controller.ts` → `AttendanceController`.
- DTOs: `dto/create-student.dto.ts`, `dto/update-student.dto.ts`, `dto/mark-attendance.dto.ts`; barrel `dto/index.ts`.
- Tests co-located: `attendance.service.ts` ↔ `attendance.service.spec.ts`. E2E in `test/` (api) or `e2e/` (web).
- Env: `.env.example` (committed, every used var tagged `[REQUIRED]`/`[OPTIONAL]`), `.env.local` (dev), `.env.production` — the triple per app. Never commit secrets. `.env` plain is forbidden.
- Ports (canonical): api 4000, web 3000, postgres 5432. `API_BASE_URL=http://localhost:4000`.
- Generated artifacts never hand-edited: `prisma/generated/`, `types/guzia-api.d.ts`.

## Root package.json scripts

```jsonc
{
  "workspaces": ["apps/*"],
  "scripts": {
    "dev": "bun --filter '@guzia/*' dev",            // both apps in parallel
    "dev:api": "bun --filter '@guzia/api' dev",
    "dev:web": "bun --filter '@guzia/web' dev",
    "build": "bun --filter '@guzia/*' build",
    "test": "bun --filter '@guzia/api' test && bun --filter '@guzia/web' test",
    "lint": "oxlint apps",
    "db:migrate": "bun --filter '@guzia/api' db:migrate",
    "db:seed": "bun --filter '@guzia/api' db:seed",
    "ai:train": "bun --filter '@guzia/api' ai:train",
    "generate:api": "bun --filter '@guzia/web' generate:api"   // swagger → types/guzia-api.d.ts
  }
}
```

## Commit convention

`type(scope): description` (conventional). One commit per completed phase step
(specs/09 lists the exact commit plan). Never commit `.env*`, `node_modules`,
`prisma/generated`, `.next`, `dist`.
