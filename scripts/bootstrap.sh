#!/usr/bin/env bash
# scripts/bootstrap.sh — one-command setup for a fresh clone.
# install deps → start Postgres → migrate → seed → train at-risk model.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "▸ Installing workspace dependencies…"
bun install

echo "▸ Starting PostgreSQL (docker compose, :5434)…"
docker compose --profile infra up -d 2>/dev/null || docker compose up -d
sleep 4

if [ ! -f apps/api/.env.local ]; then
  echo "▸ Creating apps/api/.env.local from .env.example…"
  cp apps/api/.env.example apps/api/.env.local
  echo "  ⚠ Set a real JWT_SECRET + AI_CONFIG_SECRET in apps/api/.env.local before production."
fi
if [ ! -f apps/web/.env.local ]; then
  cp apps/web/.env.example apps/web/.env.local
fi

echo "▸ Running migrations…"
(cd apps/api && bunx prisma migrate dev --name init)

echo "▸ Seeding demo data…"
(cd apps/api && bun run db:seed)

echo "▸ Training at-risk model…"
(cd apps/api && bun run ai:train)

cat <<'DONE'

✔ Bootstrap complete.

  Start dev servers:   ./scripts/dev.sh
  API        →         http://localhost:4000   (Swagger: /api/docs)
  Web portal →         http://localhost:3004
  Demo login:          admin@guziahs.edu / password123
DONE
