#!/usr/bin/env bash
# scripts/dev.sh — run API + web together for local development.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

cleanup() {
  echo ""
  echo "▸ Stopping dev servers…"
  kill 0 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "▸ API  → http://localhost:4000  (Swagger: /api/docs)"
(cd apps/api && bun run dev) &

echo "▸ Web  → http://localhost:3004"
(cd apps/web && bun run dev) &

wait
