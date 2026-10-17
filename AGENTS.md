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

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **guzia-high-school** (21923 symbols, 26587 relationships, 281 execution flows).

> Index stale? Run `node .gitnexus/run.cjs analyze --index-only` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? Bootstrap with `npx`, `bunx`, or `pnpm dlx` — e.g. `bunx gitnexus@latest analyze` (npm 11 npx crash; #1939).

## Always Do

- **MUST run impact before editing.** Use `impact({target: "symbolName", direction: "upstream"})` or `node .gitnexus/run.cjs impact "symbolName" --direction upstream --repo .`; report callers, processes, and risk. Never substitute grep for graph analysis.
- **MUST analyze graph changes before committing.** Use `detect_changes({scope: "all"})` (MCP) or `node .gitnexus/run.cjs detect-changes --scope all --repo .` (CLI fallback). `partial: true` or `truncated: true` is not a clean check — a zero means unseen, not unaffected; re-run it. For regression review: `detect_changes({scope: "compare", base_ref: "main"})` or `node .gitnexus/run.cjs detect-changes --scope compare --base-ref "main" --repo .`.
- MUST warn on HIGH/CRITICAL `risk` pre-edit; never use `riskSharedAxes` to waive a HIGH/CRITICAL `risk` warning. Compare File/symbol: MCP File omits axes; Graph-RAG expands File.
- **MUST treat `risk: UNKNOWN` as unresolved, not as low.** An empty caller set is not evidence the symbol is unused — it can also mean the callers are not resolvable by the index (plain-object property access, dynamic dispatch, cross-language calls). `impact` pairs `UNKNOWN` with a `riskNote` saying so. Confirm with a text search before treating the symbol as safe to change or delete; do not proceed on the strength of a zero.
- **MUST use `query({search_query: "concept"})` for concepts/flows, `context({name: "symbolName"})` for a named symbol, or `impact` for blast radius, on read-only callers, dependencies, imports, or execution flow.** Graph first; text search only for empty/`UNKNOWN`/literals.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method before MCP/CLI impact analysis.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis, and never read `UNKNOWN` as an all-clear — it means the walk could not answer, which is the one verdict that requires confirming by other means.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit before MCP/CLI graph change analysis.

## Resources

| Resource | Use for |
| --- | --- |
| `gitnexus://repo/guzia-high-school/context` | Codebase overview, check index freshness |
| `gitnexus://repo/guzia-high-school/clusters` | All functional areas |
| `gitnexus://repo/guzia-high-school/processes` | All execution flows |
| `gitnexus://repo/guzia-high-school/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
| --- | --- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
