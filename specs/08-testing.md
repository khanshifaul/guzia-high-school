# 08 — Testing Strategy

Rubric line: *"include basic testing of a critical feature."* Target: the three
business-logic cores + the AI scoring + one auth e2e — the things a reviewer will
poke at. Coverage over breadth; every test asserts real behavior.

## API — Jest 30 + ts-jest (co-located `*.spec.ts`, `bun --filter @guzia/api test`)

| Spec file | Covers | Key cases |
|---|---|---|
| `exams/grading.util.spec.ts` | canonical grading | band boundaries (79.99→A 3.5, 80→A+ 4.0, 32→F, 33→D); examGPA of mixed set; cgpa of exam GPAs; round-half behavior; empty-input guard throws |
| `fees/waterfall.util.spec.ts` | payment waterfall | exact-fit single invoice → PAID; partial → PARTIAL + remainder allocation line; payment > total dues → unallocated credit; multiple invoices → oldest-dueDate-first order enforced even if created out of order; zero-amount payment rejected at DTO |
| `attendance/attendance.util.spec.ts` | weighted % | all-present=100; LATE halves; empty=0; mixed known-answer (10P 2L 3A over 15 → 73.3); 60-day window extraction from fixture dates |
| `ai/at-risk.service.spec.ts` | scoring + factors | σ math vs hand-computed; threshold boundary (0.5 exactly → atRisk true); insufficient-data path emits flag; factors JSON sorted desc by |contribution|, exactly top-3; model JSON load failure → 503 with clear message |
| `ai/model.spec.ts` | learner | separable synthetic set → accuracy ≥ 0.95 after training (seeded, fast: 2 features, 200 pts); serialize→deserialize→same predictions |
| `admissions/admissions.service.spec.ts` | approve→enroll (mocked Prisma) | APPROVE: student+user created with sequential admissionNo (GHS-2026-001 → -002); REJECT: no student; re-review → 409; password returned once |
| `auth/roles.guard.spec.ts` | guard matrix | each role × route table subset; expired token → 401 |
| `ai/provider-config.service.spec.ts` | provider admin | GET never returns raw key (only `apiKeyHint`); PUT blank/omitted apiKey keeps stored key; AES-256-GCM encrypt→decrypt roundtrip; disabled config → generation services raise 503 AI_DISABLED |
| `ai/llm.service.spec.ts` | LLM layer (prisma mocked, AI_MOCK=true) | reads config row; config cache hit within TTL / invalidated on save; JSON-parse failure → 1 retry then 502 AI_OUTPUT_INVALID; mock provider returns fixture for fingerprint; baseUrl http rejected (https/localhost-http allowed) |
| `ai/plans/plans.service.spec.ts` | plan generation (mocked LLM) | week-date fill from startDate skips Fridays; week-count mismatch → 502; activate archives previous ACTIVE in transaction; single-week regenerate leaves other weeks untouched |
| `ai/tests/tests.service.spec.ts` | paper generation (mocked LLM) | marks-sum ≠ totalMarks → retry then 502; MCQ options normalized to 4; FINAL paper rejects question PATCH; editedByTeacher flag set on manual edit |

Prisma in service unit tests: mock `PrismaService` methods (jest.fn) — unit, not DB.
Deterministic everywhere: seeded RNG only, no Date.now dependence (inject clock where needed).

## API — supertest e2e (`test/*.e2e-spec.ts`, in-memory-ish: real Postgres from
compose, `prisma migrate reset` + seed before suite)

| Spec | Flow |
|---|---|
| `auth.e2e-spec.ts` | login wrong password → 401; login admin → cookie set; `/students` with cookie → 200 + list; without cookie → 401; student token → `/students` → 403 |
| `admissions.e2e-spec.ts` | POST public application → 201; admin login → queue shows it; approve → 201 returns generated password; new student login works; GET student detail contains admissionNo |

This is the "critical feature tested end-to-end": auth + the showcase workflow.

## Web — Vitest 4 + happy-dom (`bun --filter @guzia/web test`)

| Spec | Covers |
|---|---|
| `lib/zod-schemas/admission.spec.ts` | wizard schema: each step rejects missing/invalid (bn phone, class enum); full payload parses |
| `lib/api.spec.ts` | wrapper: non-OK → ApiError with message array; OK → json; credentials include |

Component tests skipped (alumni-app pattern is thin logic; e2e smoke covers rendering).

## Optional stretch (only if time remains — flagged in plans/09)

Playwright one-file smoke: login as admin → students list renders → create student
form validation error shows banner. Committed only if it passes twice in a row.

## Running

```
bun run test          # root: api (jest) + web (vitest)
bun --filter @guzia/api test:watch
docker compose --profile infra up -d && bun --filter @guzia/api test:e2e
```

CI: none (zylosync has none either). Tests must pass locally; evidence = terminal in
live demo + committed `test-reports/`.

## Rules for test code

- No snapshot tests, no "does not throw" alone, no asserting mocked returns.
- Every test names the business rule it protects (comment one-liner).
- Timezone: all date math via `date-fns` with explicit UTC; suite sets
  `TZ=Asia/Dhaka` in jest setup to match school context.
