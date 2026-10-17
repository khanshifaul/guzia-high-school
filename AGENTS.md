# Working in guzia-high-school

Spec-first monorepo for the NT Tech full-stack assessment. Read `specs/` before
building anything; `specs/02-file-structure.md` is the layout contract.

## Stack (do not change without updating specs)
- Bun workspaces (`apps/*`), single `bun.lock`
- API: NestJS 11 + Prisma 7 (`@prisma/adapter-pg`) + PostgreSQL 18 (compose), port 4000
- Web: Next.js 16 App Router + React pinned 19.2.3 + Tailwind 4 (CSS-first), port 3000
- UI kit: `@srcroot/ui` components copied into `apps/web/components/ui/` (own the code)
- Auth: JWT in httpOnly cookie (`ghs_token`), passport-jwt + RolesGuard
- Tests: Jest+supertest (api, co-located `*.spec.ts`), Vitest (web)

## Rules
- Kebab-case files; backend `<feature>.{module,controller,service}.ts` + `dto/` + co-located spec.
- Every env var documented in `.env.example` (`[REQUIRED]`/`[OPTIONAL]`); never commit `.env*`.
- All Prisma access through services; controllers never touch Prisma directly.
- One canonical grading implementation (`exams/grading.util.ts`); screens never recompute.
- LLM access only via `ai/llm/llm.service.ts` (admin-configured OpenAI-compatible provider).
- Conventional commits: `type(scope): description`; commit per phase.
- Ports: api 4000, web 3000, postgres 5432.
