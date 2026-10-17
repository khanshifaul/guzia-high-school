#!/usr/bin/env bash
# scripts/seed-reset.sh — wipe + reseed the demo database and retrain the model.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/apps/api"

echo "▸ Reseeding demo data (idempotent)…"
bun run db:seed

echo "▸ Retraining at-risk model…"
bun run ai:train

echo "✔ Database reset + model retrained."
