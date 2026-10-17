#!/usr/bin/env bash
# scripts/api-tests/run-tests.sh — API unit tests, then e2e (needs a live API).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT/apps/api"

echo "▸ Unit tests (grading / waterfall / attendance)…"
bunx jest --silent

if curl -sf http://localhost:4000/health >/dev/null 2>&1; then
  echo "▸ API is up — running e2e suite…"
  bunx jest --config test/jest-e2e.json --runInBand --silent
else
  echo "▸ API not reachable on :4000 — skipping e2e. Start it with ./scripts/dev.sh first."
fi

echo "✔ Tests complete."
