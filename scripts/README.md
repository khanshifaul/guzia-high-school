# scripts/

Operational scripts for guzia-high-school. Mirrors the zylosync `scripts/` layout,
sized for a two-app (API + web) project.

## Scripts

| Script | What it does |
|---|---|
| `bootstrap.sh` | One-command setup: install deps, start Postgres, migrate, seed, train the AI model. Run from the repo root on a fresh clone. |
| `dev.sh` | Start API + web together for local dev (API :4000, web :3004). |
| `seed-reset.sh` | Wipe + reseed the demo database (idempotent) and retrain the at-risk model. |
| `api-tests/run-tests.sh` | Run API unit tests + e2e suite (e2e needs the API running). |
| `check-docs-links.mjs` | Verify internal spec/README links resolve. |

## Conventions

- Scripts are POSIX `sh`/`bash`, `set -euo pipefail`, and runnable from the repo root.
- No secrets hardcoded — they read `.env.local` / environment.
- Ports: API `4000`, web `3004`, Postgres `5434` (see `docker-compose.yml`).

## Quick start

```bash
./scripts/bootstrap.sh      # fresh clone → running app
./scripts/dev.sh            # run API + web in watch mode
```
