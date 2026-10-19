# 09 — Delivery Plan (deadline: Sun 19 Oct 2026, submit via WhatsApp)

~48h from spec lock (Fri evening → Sun afternoon). Phases map 1:1 to commits
(conventional commits, listed below). Order is risk-first: schema + auth + grading
core early; polish last. **A working thin slice always exists** — if cut-off happens
after Phase 3, the app still demos.

## Phase 0 — Scaffold (Fri night, ~2h)
- Root: package.json workspaces, bun.lock, docker-compose (postgres 18), .gitignore,
  .oxlintrc.json, AGENTS.md, README skeleton, .env.example ×2.
- `apps/api`: NestJS bootstrap + config/Joi + Prisma module + Swagger + health route.
- `apps/web`: Next 16 app + globals.css tokens (alumni-app verbatim) + ui kit copy
  (pruned) + shells (public navbar, portal sidebar skeleton) + login page + proxy.ts.
- Commit: `chore: scaffold bun-workspace monorepo (nestjs api + next web, pg18, tokens)`

## Phase 1 — Schema + auth (Sat morning, ~3h)
- Full Prisma schema (specs/04) + first migration + GradeBand seed.
- auth module: login/me/logout, JWT cookie, JwtAuthGuard global, RolesGuard, decorators.
- web: lib/api.ts, auth-client, language-context, portal layout session gate, role nav.
- API tests: roles.guard.spec.
- Commits: `feat(api): prisma schema + migration + grade bands seed`,
  `feat(api): cookie-jwt auth with roles guard`, `feat(web): login + role-routed portal shell`

## Phase 2 — Academic core CRUD (Sat midday, ~4h)
- students, teachers, classes/subjects/class-subjects modules (CRUD + validation + specs).
- web admin pages: students list/detail/new, teachers, classes.
- Commit: `feat: students/teachers/classes crud (api + admin pages)`

## Phase 3 — Attendance + exams/grading (Sat evening, ~4h)
- attendance mark/query (+weighted util + tests); exams module: marks bulk upsert,
  publish, report-card, results endpoints; grading.util + tests; grade-bands PUT.
- web: teacher attendance/mark (fast P/A/L grid), teacher grades/entry (+CSV paste),
  admin attendance matrix, admin grades pages, student attendance + grades pages.
- Commits: `feat: attendance marking + weighted pct`,
  `feat: exams, marks entry, canonical grading (gpa/cgpa) + tests`

## Phase 4 — Fees + admissions + notices (Sun morning, ~4h)
- fees module: fee-heads, invoice generate, payments waterfall (+tests).
- admissions: public submit, admin queue/review transaction (+e2e).
- notices CRUD. web: admin fees + record-payment page (live waterfall preview),
  admin admissions queue + detail, public 4-step wizard, student/parent fees+notices.
- Commits: `feat: fee heads, invoices, payment waterfall + tests`,
  `feat: admission application workflow (public form → admin approve → enrollment)`,
  `feat: notices + parent portal`

## Phase 5 — AI (Sat night + Sun morning, ~6h)

**5a — at-risk classifier (~2.5h):** ai/model.ts (logistic regression), train.ts,
at-risk.service, controller, model JSON, eval report; admin at-risk page + dashboard
mini-list; model.spec + at-risk.service.spec; `bun run ai:train` executed, report committed.
Commits: `feat(ai): at-risk classifier (train, evaluate, serve, explain)`,
`feat(web): at-risk board with factor explanations`

**5b — LLM provider admin + plan generator (~3.5h):** llm/ layer (openai SDK client,
MockProvider + fixtures, AES key storage, 60s cache), AiProviderConfig (migration +
env-seed), provider-config service/controller; admin settings AI panel + Test
connection; plans module (generate/edit/activate/per-week regenerate, Friday-skip
dates, progress %) + teacher plans pages.
Commits: `feat(ai): admin-controlled openai-compatible provider (masked key, test-connection)`,
`feat(ai): year/term plan generator with per-week regenerate`

**5c — test generator + source assistant (stretch, Sun after 5b):** tests module
(blueprint validation, marks-sum, answer key, print view); sources module (multer
upload, unpdf extract, chunking, summarize, ask + keyword retrieval, →test bridge)
+ teacher pages. Commit as two commits per module.
If 5c runs out of road: sources upload+summary ships without ask-citations (spec 10
cut priority); toolkit eval report records what shipped.

## Phase 6 — Hardening + docs (Sun early afternoon, ~3h)
- assignments module + teacher grading page + student submit (if not earlier — lowest
  priority: cut here first if pressed).
- supertest e2e (auth + admissions) green; vitest schemas green; `bun run lint` clean.
- README: setup, demo credentials table, architecture diagram, API pointer,
  **AI section (inputs/outputs/limits/eval)**, known limitations, future work.
- Seed finalization: deterministic dataset matching specs/04 + AI demo cases.
- Final commits per module; `git log` reads as a clean narrative.
- Commit: `test: e2e auth+admissions, vitest schemas; docs: readme with ai explanation`

## Cut-line priority (if time runs short)

Cut order: ① assignments pages → ② parent portal extras (keep dashboard+fees) →
③ CSV paste in marks entry → ④ at-risk factor chips (keep score+badge) →
⑤ notices teacher-create (keep admin notices) → ⑥ calendar heat-view (keep % only) →
⑦ teacher-AI cuts per spec 10 (ask-citations → per-week regenerate → →to-test bridge;
**keep**: plan generate+edit+save, test generate+edit+save, upload+extract+summary,
provider settings panel, mock provider).
**Never cut:** auth, grading, waterfall, admission workflow, AI board, provider
settings, tests, README.

## Submission checklist (Sun, before WhatsApp)

- [ ] `git log --oneline` — ≥12 meaningful conventional commits, no secrets
- [ ] Fresh clone test: `bun install && docker compose up -d && bun run db:migrate && bun run db:seed && bun run dev` works
- [ ] All 4 demo logins land correctly; demo script (specs/06 flows) runs end-to-end
- [ ] `bun run test` green (unit + e2e); lint clean
- [ ] `bun run ai:train` reproducible; model JSON + eval report committed
- [ ] README: setup, env example, credentials, architecture, AI explanation + limits
- [ ] `.env.example` complete and tagged
- [ ] Git repo pushed to GitHub (private link OK) — submission = repo link + brief
      explanation doc (README covers it) + demo readiness; send via WhatsApp 01945411140
- [ ] Live-review prep: Swagger `/api/docs` loaded, demo data fresh (`db:seed` rerun),
      talking points for AI eval + waterfall + grading single-source decision

## Risk register

| Risk | Mitigation |
|---|---|
| Next 16 quirks (middleware→proxy rename, turbopack) | follow zylosync AGENTS.md: proxy.ts, `next build --webpack` fallback already in alumni-app |
| Prisma 7 client-gen output dir confusion | generator output `prisma/generated`, jest moduleNameMapper (copied from zylosync api config) |
| Cookie cross-port friction (3000↔4000) | same-site localhost OK in dev; web proxies `/api/*` server-side anyway |
| Time blowout on UI polish | design recipes are copy-paste from alumni-app; no new component design allowed during build |
| AI training nondeterminism | seeded RNG everywhere; model JSON committed — inference never trains at runtime |
| External LLM flaky/keys missing on demo day | provider-config with **Test connection** in admin; the seeded mock provider row or a local Ollama fallback; toolkit artifacts (plan/paper) saved in DB so pre-generated demo content survives |
| LLM output malformed JSON | JSON mode + zod validation + one retry → 502 AI_OUTPUT_INVALID; raw text logged, never persisted |
