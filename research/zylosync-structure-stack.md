# zylosync — FILE-STRUCTURE + TECH-STACK (latest) Reference

Analyzed: `/home/khan/Projects/zylosync` @ 2026-10-17 (HEAD state of working tree).
Role: structure/stack reference for `guzia-high-school`. All versions below are the **declared ranges in package.json** (caret ranges; resolved via root `bun.lock`).

---

## 1. Workspace Tree (exact, annotated)

**No `packages/`, no `libs/`, no `turbo.json`, no `pnpm-workspace.yaml`.** Workspaces are declared in root `package.json` (`"workspaces": ["apps/*"]`) and orchestrated with **bun filters** (`bun --filter '@zylosync/{api,portal,...}' dev`). There is **no shared-code package** — cross-app types are generated from the backend OpenAPI spec (see §3).

```
zylosync/                              # root = workspace orchestrator only
├── package.json                       # workspaces: ["apps/*"]; bun scripts; root devDeps (typescript, oxlint, oxfmt)
├── bun.lock                           # SINGLE lockfile (bun — NOT npm/pnpm/yarn)
├── VERSION                            # plain version stamp file
├── docker-compose.yml                 # ALL infra + app containers, profile-driven (see §5)
├── .oxlintrc.json                     # root lint config (shared rules; per-app overrides exist)
├── .gitignore                         # ignores .env*, *.log, prisma/generated/ etc.
├── CLAUDE.md                          # agent orientation; states stack table (some stale, see note)
├── AGENTS.md                          # AUTHORITATIVE coding standards (env rules, versions, patterns)
├── OPEN-QUESTIONS.md                  # unresolved founder decisions (append-only)
├── HANDOFF.md                         # append-only session log (NOT docs — ~380KB)
├── .mcp.json / opencode.json          # agent tool config
│
├── apps/                              # ← ALL code; 7 apps, each self-contained with own package.json
│   ├── api.zylosync.app/              # @zylosync/api 0.0.2 — NestJS 11 modular monolith, port 40001
│   ├── portal.zylosync.app/           # @zylosync/portal 0.1.0 — Next.js 16 merchant dashboard, port 3001
│   ├── platform.zylosync.app/         # @zylosync/platform 0.1.0 — Next.js 16 platform-admin console, port 3002
│   ├── marketing.zylosync.app/        # @zylosync/marketing 0.1.0 — Next.js 16 public site, port 3000 (apex)
│   ├── storefront.zylosync.app/       # @zylosync/storefront 0.1.0 — Next.js 16 tenant storefronts, port 30001
│   ├── docs.zylosync.app/             # @zylosync/docs 0.1.0 — Next.js 16 docs site, port 3003
│   └── whatsapp.zylosync.app/         # @zylosync/whatsapp 0.1.0 — plain TS Node worker (whatsapp-web.js), no Next
│
├── infrastructure/                    # deploy/infra assets (NOT referenced by app code)
│   ├── k8s/                           # kustomize: base/ + overlays/ + services/ + registry/ (kubectl apply -k)
│   ├── k3s/                           # registries.yaml (private registry)
│   ├── postgres/                      # init-primary.sh (replication user), SSL + firewall scripts
│   ├── cloudflare/                    # fallback-origin (apex domain)
│   ├── cloudflared/                   # tunnel setup.sh + README
│   └── docker/                        # daemon.json
│
├── scripts/                           # ops/automation (rollout_app.sh = prod deploy; dev-replica.sh; check-*.py validators; agents/, sim/, automations/)
├── specs/                             # SPEC-FIRST feature specs: specs/<domain>/<feature>.spec.md (domain folders: commerce/, ai/, platform/, frontend/…)
├── plans/                             # numbered planning docs: 01-architecture/ … 10-company-ops/
├── docs/legal/                        # legal docs only (product docs live in apps/docs.zylosync.app)
├── test-reports/                      # QA/Lighthouse/load-test reports (dated: qa-<app>-<date>.md)
├── reports/  hr/  .firecrawl/         # business research, HR files, scraping cache (not code)
├── .github/workflows/sim-nightly.yml  # ONLY workflow (nightly simulation + regression gate; cron 03:00 UTC)
│                                      # NOTE: deploy.yml was DELETED 2026-10-02 — there is NO build/deploy CI
├── .agents/                           # multi-agent orchestration state (foreman/worktrees/results) — agent ops, not app code
└── .gitnexus/                         # code-graph index cache (gitignored)
```

### API app internal layout (the one backend)

```
apps/api.zylosync.app/
├── package.json                       # jest config + prisma.seed inline; scripts: db:migrate/db:seed/build
├── tsconfig.json                      # module nodenext, target ES2023, paths: src/*, prisma/generated/*
├── tsconfig.build.json / nest-cli.json / prisma.config.ts
├── Dockerfile  .dockerignore  .env.example  .env.local(gitignored)  .env.production(gitignored)
├── .prettierrc                        # {"singleQuote":true,"trailingComma":"all"} (only formatting config in repo)
├── .oxlintrc.json                     # app-level lint overrides
├── jest.setup.ts                      # setupFilesAfterEach for all unit tests
├── prisma/
│   ├── schema.prisma                  # 7201 lines; generator output = "generated" (cjs); 23 Postgres schemas
│   ├── generated/                     # prisma-client output (GITIGNORED)
│   ├── migrations/
│   ├── seed.ts  seed-demo-tenants.ts  seed-medicines.ts  seed-data/
├── src/
│   ├── main.ts  app.module.ts         # bootstrap + Swagger
│   ├── common/                        # PrismaModule/Service, guards, filters, middleware (csrf.middleware.ts, tenancy.middleware.ts)
│   ├── config/                        # env validation (Joi / ConfigModule)
│   ├── swagger/                       # swagger.service.ts (+ .spec)
│   └── <domain>/                      # ~100+ domain modules, e.g.:
│       ├── auth/                      #   auth.module.ts
│       │   ├── authentication/        #   authentication.controller.ts + .service.ts + dto/ (+ co-located .spec.ts)
│       │   ├── two-factor/  token/  session/  oauth/  sso/  common/
│       ├── campaigns/
│       │   ├── campaign.module.ts
│       │   ├── campaign.controller.ts (+ .spec.ts)
│       │   ├── campaign.service.ts (+ .spec.ts)
│       │   ├── campaign.listener.ts
│       │   └── dto/create-campaign.dto.ts, schedule-campaign.dto.ts, index.ts
│       └── … orders, payments, hrm, payroll, inventory, storefront, courier, sms, …
├── scripts/                           # check-tenant-models.ts (runs in build!), verify-*.ts
├── test/                              # e2e: *.e2e-spec.ts, test/e2e/, test/__mocks__/ (nanoid, uuid)
├── specs/                             # per-app specs (e.g. google-signin.spec.md)
└── logs/                              # winston daily-rotate files (app-/error-/security-YYYY-MM-DD.log)
```

### Portal app internal layout (representative frontend)

```
apps/portal.zylosync.app/
├── package.json  next.config.ts  postcss.config.mjs  tsconfig.json
├── vitest.config.ts                   # vitest 4: alias '@'→app root; env node; html report → test-report/
├── playwright.config.ts  playwright.qa.config.ts   # Playwright e2e
├── proxy.ts                           # ← Next.js 16 middleware convention (NOT middleware.ts)
├── Dockerfile  .dockerignore  .env.example  .env.local  .env.production  .oxlintrc.json (46KB per-app rules)
├── app/                               # App Router root
│   ├── layout.tsx  global-error.tsx  sw.ts (serwist PWA)  robots.ts  manifest.ts  globals.css
│   ├── (tenant)/                      # route group = tenant-scoped pages; private _components/ folders inside
│   └── api/  auth/  session-expired/  serwist/
├── components/                        # ui/ (shadcn-style), portal/, providers/, ai-assist/, search/, _components/
├── hooks/                             # use-*.ts (use-user.ts, use-tenant.ts, use-session-role.ts …)
├── lib/                               # actions/ (server actions), api-client.ts, runtime-config.ts, mock-data/, __tests__/
├── types/zylosync-api.d.ts            # ← GENERATED API client types (openapi-typescript) — the shared-types story
├── messages/en.json  bn.json          # next-intl i18n bundles
├── i18n/routing.ts  request.ts        # next-intl wiring
├── scripts/                           # generate-api-client.ts, generate-loading-skeletons.mjs, loading-* checks
├── e2e/                               # *.spec.ts Playwright flows + steps/ + qa-sweep-report.ts
├── selenium-tests/                    # legacy Python e2e (pytest + ruff) — ignore for new projects
├── specs/  public/  test-report/  test-results/  mock_data.json
```

---

## 2. Tech Stack Table

| Layer | Choice | Exact version (declared) | Where declared |
|---|---|---|---|
| Monorepo runtime | **Bun** (workspaces + filters) | engines `node >=20.0.0`; lockfile `bun.lock` | root `package.json` |
| Workspace wiring | `"workspaces": ["apps/*"]` + `bun --filter '@zylosync/*'` | — | root `package.json` scripts |
| Backend framework | **NestJS** (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`) | `^11.1.12` (cli `^11.0.16`) | `apps/api.zylosync.app/package.json` |
| Language | **TypeScript** | `^5.9.3` (api), `^5`/`^5.7.2` (frontends) | per-app `package.json` |
| Node engine | Node 20+ (Docker base `node:20-alpine`) | `>=20.0.0` | root engines; AGENTS.md Dockerfile standard |
| ORM | **Prisma** + `@prisma/client` + `@prisma/adapter-pg` driver adapter | `^7.8.0` each | api `package.json` |
| Prisma client gen | `provider = "prisma-client"`, `output = "generated"`, `moduleFormat = "cjs"`, preview `fullTextSearchPostgres` | — | `prisma/schema.prisma` head |
| Read-scale | `@prisma/extension-read-replicas` (`$primary()`/`$replica()`) | `^0.5.0` | api `package.json`; AGENTS.md §Read Replica |
| Database | **PostgreSQL** image `postgres:18-alpine` (primary 5432 + streaming replica 5433) | image tag `18-alpine` | `docker-compose.yml` (⚠ CLAUDE.md says "PostgreSQL 16" — STALE; compose wins) |
| PG driver | `pg` (+ `@types/pg`) | `^8.17.1` (AGENTS.md min `^8.21.0`) | api `package.json` |
| Multi-tenancy | Prisma multi-**schema** Postgres: `schemas = ["base","commerce","crm",…23 schemas]`; tenancy middleware | — | `prisma/schema.prisma`, `src/common/middleware/tenancy.middleware.ts` |
| API style | **REST** (NestJS controllers) + **Swagger** (`@nestjs/swagger` `^11.2.5` + swagger-ui-express); Socket.IO `^4.8.3` websockets; NO tRPC | as listed | api `package.json`; Swagger at `/api/docs` |
| Input validation | **class-validator** `^0.14.3` + **class-transformer** `^0.5.1` (DTOs); **Joi** `^18.0.2` for env validation | as listed | api `package.json` |
| Auth | **Passport** stack: `passport` `^0.7.0`, `passport-jwt` `^4.0.1`, `passport-local` `^1.0.0`, OAuth (google `^2.0.0`, facebook `^3.0.0`, github2 `^0.1.12`), SAML SSO (`@node-saml/passport-saml` `^5.1.0`); `bcryptjs` `^3.0.3`; 2FA `otplib` `^12.0.1` + qrcode; sessions `express-session` `^1.18.2` + Redis store; CSRF `csrf-csrf` `^4.0.3`; JWT `@nestjs/jwt` `^11.0.2` | as listed | api `package.json`; `src/auth/{authentication,token,session,two-factor,oauth,sso}/` |
| Frontend framework | **Next.js 16** (App Router) | `^16.2.6` (docs `^16.2.10`) | 5 Next apps' `package.json` |
| React | `react` / `react-dom` pinned EXACT | `19.2.3` | every Next app |
| Next middleware | `proxy.ts` convention (NOT `middleware.ts`) | Next 16 | AGENTS.md; `apps/portal.zylosync.app/proxy.ts` |
| Styling | **Tailwind CSS 4** via `@tailwindcss/postcss` `^4`; CVA `^0.7.1` + `clsx` `^2.1.1` + `tailwind-merge` `^3.4.0` (shadcn-style `components/ui/`); toasts `sonner` `^2.0.7`; dark mode `next-themes` `^0.4.6`; animation `motion` `^12.26.2`, `gsap` `^3.14.2` | as listed | frontend apps |
| Client-side validation | **zod** | `^4.3.5` (storefront `^4.3.6`) | frontend apps |
| i18n | **next-intl** (`messages/en.json`, `bn.json`) | `^4.13.0` (docs `^4.13.4`) | portal/marketing/docs |
| API client types | **openapi-typescript** generating `types/zylosync-api.d.ts` from backend Swagger (`bun run generate:api`) | `^7.13.0` | portal `package.json`; `scripts/generate-api-client.ts` |
| Queue | **RabbitMQ** (`rabbitmq:3-management-alpine`, 5672 + mgmt 15672), `amqplib` | `^2.0.1` (api) | docker-compose; api pkg |
| Cache / session | **Redis** (`redis:7-alpine`, 6379), node-redis + `@socket.io/redis-adapter` | `redis` `^6.2.1`, adapter `^8.3.0` | docker-compose; api pkg |
| Object storage | MinIO (dev-only profile) → Cloudflare R2 in prod (`@aws-sdk/client-s3` `^3.975.0`) | as listed | docker-compose; api pkg |
| Email | `@aws-sdk/client-sesv2` `^3.1121.0`, `nodemailer` `^9.0.3`, `resend` `^6.25.0`; `handlebars` `^4.7.9` templates | as listed | api pkg |
| Payments | `stripe` `^20.1.2` (+ SSLCommerz flows in portal) | `^20.1.2` | api pkg |
| Observability | Sentry (`@sentry/nestjs` `^10.73.0`, `@sentry/nextjs` `^9.0.0`), winston `^3.19.0` + daily-rotate-file, `posthog-js` `^1.422.2` | as listed | api/portal pkg |
| Testing (unit, API) | **Jest 30** `^30.2.0` + `ts-jest` `^29.4.6` + **supertest** `^7.2.2`; `jest-html-reporter` `^4.4.0` | as listed | api `package.json` inline `jest` config |
| Testing (unit, FE) | **Vitest 4** `^4.1.11` + `@vitest/coverage-v8` + `@vitest/ui`, `happy-dom` `^15.11.7` | as listed | all Next apps; per-app `vitest.config.ts` |
| Testing (e2e) | **Playwright** (portal `e2e/`, docs); API e2e = jest `*.e2e-spec.ts` + supertest | `@playwright/test` `^1.60.0` | portal/docs pkg |
| Lint | **oxlint** (`oxlint --type-aware`), root config + per-app `.oxlintrc.json`; `oxlint-tsgolint` | `^1.78.0` (root) | root `package.json`, `.oxlintrc.json` |
| Format | **oxfmt** (root); `.prettierrc` `{"singleQuote":true,"trailingComma":"all"}` only in api | `^0.63.0` | root pkg; api `.prettierrc` |
| Type-check policy | AGENTS.md: NEVER run standalone `tsc --noEmit` — use `oxlint --type-aware` (apps still ship `type-check` scripts; policy is authoritative) | — | AGENTS.md §2 |
| CI | **No build/deploy CI.** Only `.github/workflows/sim-nightly.yml` (nightly sim + regression gate, cron 03:00 UTC, main-only) | — | `.github/workflows/` |
| Deploy | Manual: `scripts/rollout_app.sh` + `kubectl apply -k infrastructure/k8s/overlays/local`; per-app multi-stage Dockerfile (`node:20-alpine`) | — | AGENTS.md; `infrastructure/k8s/` |
| PWA | serwist | `^9.5.12` (`serwist`, `@serwist/turbopack`) | portal pkg |
| SEO audit | unlighthouse | `^0.18.0` | root devDeps + `.unlighthouse/` |

**docker-compose services** (single root `docker-compose.yml`, 641 lines, profiles `infra`/`core`/`services`/`frontend`/`dev`/`all`):
`postgres` (18-alpine primary, tuned flags, healthcheck), `postgres-replica` (18-alpine, `pg_basebackup` streaming replica on 5433), `postgres-dev-replica`, `backend` (build `./apps/api.zylosync.app`, port 40001, `env_file: .env.local`, docker.sock mount for per-tenant storefront containers), `rabbitmq` (5672/15672), `redis` (6379), `minio` + `minio-init` (dev-only, bucket bootstrap), `marketing` (3000), `portal` (3001), `platform` (3002), `docs` (3003), `storefront` (30001), `whatsapp-agent`, `frontend` (legacy reference copy on 3005 — ignore). Network `zylosync-network`; memory limits on every service. Dev workflow: `docker compose --profile infra up -d` then apps run on host via bun.

---

## 3. Directory Conventions (what goes where and naming rules)

**File naming — strict kebab-case everywhere**, dot-suffixes on the backend:
- Backend: `<feature>.module.ts`, `<feature>.controller.ts`, `<feature>.service.ts`, `<feature>.listener.ts`, `<feature>.middleware.ts`; tests co-located `<same-name>.spec.ts` NEXT TO source (jest rootDir `src`, testRegex `.*\.spec\.ts$`).
- DTOs: `dto/create-<feature>.dto.ts`, `dto/update-<feature>.dto.ts`, per-folder `dto/index.ts` barrel.
- Frontend: `kebab-case.ts(x)` components; hooks `use-<thing>.ts`; co-located `*.spec.ts(x)`; private `_components/` folders; route groups `(tenant)`.
- All folders kebab-case (`purchase-orders/`, `platform-support-tickets/`).

**Backend required structure** (AGENTS.md, verified on disk):
```
src/main.ts, src/app.module.ts, src/common/ (Prisma + guards/filters/middleware),
src/config/ (env validation), src/swagger/, src/<domain>/<files>+dto/, prisma/generated/ (gitignored)
```

**Shared types**: NO shared package by design. Portal generates a global `.d.ts` from backend Swagger via `openapi-typescript` (`scripts/generate-api-client.ts` → `types/zylosync-api.d.ts`). New frontends copy this.

**Env files** (non-negotiable, per AGENTS.md — every app has all three):
| File | Purpose | Committed |
|---|---|---|
| `.env.example` | documented blank template; every used var MUST appear; tagged `[REQUIRED]`/`[OPTIONAL]` | YES |
| `.env.local` | dev secrets + localhost URLs | gitignored |
| `.env.production` | prod secrets | gitignored |
Frontend public vars: `NEXT_PUBLIC_*`. Runtime config (public keys, flags) is fetched at runtime from backend `GET /api/public-config` (portal `lib/runtime-config.ts`), NOT baked into frontend env.

**Ports** (canonical): marketing 3000, portal 3001, platform 3002, docs 3003, storefront 30001, api 40001, postgres 5432/5433, redis 6379, rabbitmq 5672/15672, minio 9000/9001. Dev hosts use `*.localhost` (`next dev -H portal.localhost`).

**Spec-first**: every feature requires `specs/<domain>/<feature>.spec.md` BEFORE code. Plans live in numbered `plans/0N-*/`. Session knowledge: `HANDOFF.md` (append-only log), `OPEN-QUESTIONS.md`, `AGENTS.md` (permanent rules).

**Commit convention**: `git commit -m "type(scope): concise description"` (conventional commits, no bot); commit after every phase, then push; never commit secrets. Multi-agent workers commit `foreman/<task>` branches, founder merges.

**Docker**: every backend service ships a multi-stage Dockerfile (base `node:20-alpine` → deps → build → prod `node dist/main.js`). API build runs `prisma generate` + `check-tenant-models.ts` guard before `nest build`.

**Module pattern** (copy for a new domain): `src/<domain>/<domain>.module.ts` + `.controller.ts` (Swagger-decorated REST) + `.service.ts` (all Prisma access) + `dto/` (class-validator) + co-located `.spec.ts` for service and controller. Auth is one `auth/` module split into sub-feature folders (authentication, token, session, two-factor, oauth, sso) with shared `common/` (guards/strategies).

---

## 4. Config Files inventory

| File | Purpose / key facts |
|---|---|
| `package.json` (root) | workspaces `["apps/*"]`; dev/run/build/test/lint filtered per `@zylosync/*`; devDeps: `@types/node ^20.17.0`, `oxfmt ^0.63.0`, `oxlint ^1.78.0`, `oxlint-tsgolint ^7.0.2001`, `typescript ^5.9.3`, `unlighthouse ^0.18.0`; dep `posthog-js ^1.422.2` |
| `bun.lock` | the ONLY lockfile |
| `docker-compose.yml` | all services, profile-driven; healthchecks + memory limits; backend gets URLs/DB via `environment:` block, secrets via `env_file` |
| `.oxlintrc.json` (root) | plugin typescript; category `correctness` OFF; type-aware unsafe-* rules WARN; ignores `**/node_modules/**`, `**/dist/**`, `**/.next/**`, `**/prisma/generated/**`, `**/src/generated/**`, `scripts/sim/**`, `specs/`, `plans/`, `test-reports/`, `infrastructure/`, `runbooks/` |
| `.oxlintrc.json` (per app) | portal 46KB ruleset; api 1KB — apps extend root |
| `.prettierrc` (api only) | `{"singleQuote":true,"trailingComma":"all"}` |
| api `package.json` inline `jest` | rootDir `src`, testRegex `.*\.spec\.ts$`, ts-jest transform, `setupFilesAfterEnv: ../jest.setup.ts`, moduleNameMapper `^src/*`, mocks `nanoid`/`uuid`, `prisma/generated/client`, html reporter → `test-report.html` |
| portal `vitest.config.ts` | alias `@ → ./`, `globals: true`, env `node`, include `lib|components|app|hooks/**/*.spec.ts(x)`, exclude `e2e/**`, html report → `test-report/index.html` |
| `playwright.config.ts` / `playwright.qa.config.ts` (portal) | e2e + QA sweep configs |
| api `tsconfig.json` | `module/moduleResolution: nodenext`, `target: ES2023`, decorators ON (`emitDecoratorMetadata`, `experimentalDecorators`), `strictNullChecks`, `noImplicitAny`, `forceConsistentCasingInFileNames`, paths `src/*`, `prisma/generated/*` |
| per-app `next.config.ts` | portal: `/api/:path*` rewrite appending `/api` to `API_BASE_URL` |
| `postcss.config.mjs` | `@tailwindcss/postcss` (Tailwind v4 CSS-first) |
| `proxy.ts` (portal, 18KB) | Next 16 middleware: auth guard, CSRF, request forwarding |
| `infrastructure/k8s/{base,overlays}` | kustomize manifests; deploy = `kubectl apply -k` |
| `.github/workflows/sim-nightly.yml` | nightly regression sim (spin Postgres, `bun install`, harness, regression check, artifacts) |
| `.gitignore` (root, 8.4KB) | `node_modules/`, `.env*`, `*.log`, `prisma/generated/` |
| `ecosystem.config.cjs` (portal) + api `pm2` script | pm2 process configs |

---

## 5. Conventions Worth Copying (for guzia-high-school)

1. **Flat `apps/` monorepo with bun workspaces, no shared package.** One backend + N frontends; orchestration via `bun --filter '@zylosync/{...}'`. Skip turbo/nx.
2. **Env-file triple** `.env.example` (committed, documented, `[REQUIRED]`/`[OPTIONAL]` tagged) + `.env.local` + `.env.production` (gitignored) — per app. README demo-credentials table (zylosync: `demo@zylosync.com` / `Pa$$w0rd!`, Swagger at `/api/docs`).
3. **Spec-first** `specs/<domain>/<feature>.spec.md` before code; AGENTS.md-style permanent rules file so all contributors share one convention source.
4. **Module-per-domain NestJS layout**: `<feature>.{module,controller,service}.ts` + `dto/` + co-located `.spec.ts`; kebab-case everywhere; class-validator DTOs; Joi env validation; Swagger.
5. **Prisma conventions**: `prisma/schema.prisma`, client generated to gitignored `prisma/generated/`, `cuid()` ids, `createdAt/updatedAt/deletedAt` columns, validate→generate→migrate workflow, seed scripts per tenant with demo accounts.
6. **Test placement**: unit specs co-located with source (`*.spec.ts`); e2e in `test/` (API, `*.e2e-spec.ts` + supertest) or `e2e/` (frontends, Playwright); dated HTML/markdown reports kept in `test-reports/`.
7. **Frontend conventions**: App Router + `proxy.ts` (Next 16 middleware), `(tenant)` route groups, `_components/` private folders, `use-*.ts` hooks, `lib/` for api-client/runtime-config/server actions, `components/ui/` shadcn-style (CVA + clsx + tailwind-merge), Tailwind 4, sonner toasts, next-themes, next-intl per-locale JSON.
8. **Generated API client** via openapi-typescript from backend Swagger → `types/zylosync-api.d.ts`; typed contract without a shared package.
9. **Docker-compose with profiles** (`infra` for host dev, `all` full containerized), healthchecks + memory limits everywhere; one-command dev bring-up.
10. **Conventional commits** `type(scope): description`, commit-per-phase, secrets never committed; README + `.env.example` + demo credentials as explicit deliverables (matches assessment requirements directly).
11. **One fast linter as lint+typecheck** (oxlint type-aware) with root + per-app configs — the pattern is "one fast tool, config committed"; plain eslint/prettier is an acceptable substitute for the assessment.
12. **Simplify for a school app**: zylosync's read-replica, RabbitMQ, 23-schema multi-tenancy, SAML layers are enterprise extras. Keep: modular monolith, JWT/local auth with role guards, single Postgres, Prisma migrations + seed demo accounts, one AI feature (e.g., at-risk student / grade prediction) in its own `src/ai/` module with documented inputs/outputs/limitations/evaluation, and the spec-first + env-triple + co-located-tests conventions.

⚠ **Version conflicts to resolve when copying**: docker-compose uses `postgres:18-alpine` while CLAUDE.md says "PostgreSQL 16" (compose is ground truth); AGENTS.md pins minimums (`pg ^8.21.0`, `typescript ^5.8.0`) slightly different from api's declared ranges (`pg ^8.17.1`, `ts ^5.9.3`) — trust the package.json declarations. React is pinned EXACT `19.2.3` (no caret) across all Next apps — copy that pin behavior.
