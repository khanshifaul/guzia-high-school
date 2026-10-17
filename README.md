# Guzia High School — Management Portal (Spec Set)

Full specification for **Guzia High School Management Portal** — a single-school
high-school management system (grades 6–10, Bangladesh context, bilingual EN/BN)
built as the NT Tech Innovation Full-Stack Developer assessment
(deadline **19 Oct 2026**).

- **Design reference:** alumni-app (orange theme, w-72 pill sidebar, micro-typography)
- **File structure & tech stack reference:** zylosync (latest) — bun-workspaces monorepo,
  NestJS 11 + Prisma 7.8 + PostgreSQL 18, Next.js 16 + React 19.2.3 + Tailwind 4, spec-first
- **Feature mining:** school-erp (menu taxonomy), School-management (attendance/fees/exams
  patterns), Unifiedtransform (grading workflow, teacher scoping)

## Spec index

| Spec | Contents |
|---|---|
| [specs/00-product-overview.md](specs/00-product-overview.md) | Vision, users, assessment rubric mapping, scope in/out |
| [specs/01-architecture.md](specs/01-architecture.md) | Monorepo layout, stack table (exact versions), request flow, key decisions + rationale |
| [specs/02-file-structure.md](specs/02-file-structure.md) | Exact directory tree, naming conventions, env-file triple, module pattern |
| [specs/03-design-system.md](specs/03-design-system.md) | Design tokens (verbatim CSS), layout shells, component recipes, page patterns |
| [specs/04-data-model.md](specs/04-data-model.md) | Full Prisma schema, enums, relations, seed dataset |
| [specs/05-api-contract.md](specs/05-api-contract.md) | REST endpoint table, auth flow, validation, error shape, generated client |
| [specs/06-features.md](specs/06-features.md) | Per-role feature matrix + business-logic formulas (grading, attendance, fee waterfall, admission workflow) |
| [specs/07-ai-feature.md](specs/07-ai-feature.md) | At-risk student classifier: features, model, training, evaluation, limitations |
| [specs/08-testing.md](specs/08-testing.md) | Test inventory: Jest unit (grading/waterfall/AI), supertest e2e, Vitest, optional Playwright |
| [specs/09-delivery-plan.md](specs/09-delivery-plan.md) | 2-day phased build plan, git commit plan, submission checklist |
| [specs/10-ai-teacher-toolkit.md](specs/10-ai-teacher-toolkit.md) | Teacher AI on admin-configured OpenAI-compatible provider: year/term plan generator, test-paper generator, source-grounded assistant (PDF/image upload → summarize / ask with citations / generate test) |

## Research backing (analysis of reference projects)

`research/` contains the raw analysis these specs are derived from:

- `research/alumni-app-design.md` — full design-system replication spec
- `research/zylosync-structure-stack.md` — structure + version-pinned stack
- `research/existing-guzia-high-school.md` — state audit of the prior MyLab attempt
  (70% UI done on mocks; these specs supersede it with a fresh zylosync-structured build)
- `research/features-school-erp.md`, `research/features-school-management.md`,
  `research/features-unifiedtransform.md` — feature inventories + portable logic

## Relationship to `/run/media/khan/Studio/Projects/MyLab/guzia-high-school`

That repo is an earlier single-app attempt (Next.js fullstack, better-auth, all domain
data on in-memory mocks — see research audit). Decision: **build fresh** in this directory
per zylosync structure. The old repo remains a page-flow reference only: its ~50 page
blueprints (4 role portals, bilingual labels in `lib/data-translations.ts`, domain
interfaces in `data/types.ts`) inform specs 06 and 04 but no code is imported.

## Quick facts

- **Roles:** admin, teacher, student, parent
- **Monorepo:** `apps/api` (NestJS, port 4000) + `apps/web` (Next.js, port 3000), bun workspaces
- **AI features:** ① self-built logistic-regression **at-risk classifier** (spec 07);
  ② **teacher toolkit** — year/term plans, test papers, source-grounded assistant —
  running on an **admin-controlled OpenAI-compatible provider** (DeepSeek/OpenAI/Groq/
  local Ollama; base URL + models + masked key + test-connection in admin settings; mock
  provider for offline tests/demo) — specs/10
- **Business logic:** canonical 4.0-scale grading, weighted attendance %, oldest-first payment
  waterfall, admission approve→enroll transaction
- **Submission:** git repo + README + `.env.example` + demo credentials + working demo,
  via WhatsApp per the assessment email
