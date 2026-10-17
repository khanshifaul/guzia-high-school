#!/usr/bin/env bash
# infrastructure/postgres/backup.sh — dump the demo DB to a timestamped file.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="infrastructure/postgres/backup-${STAMP}.sql"

echo "▸ Dumping ghs database → ${OUT}"
docker compose exec -T postgres pg_dump -U ghs ghs > "$OUT"
echo "✔ Backup written: ${OUT} ($(du -h "$OUT" | cut -f1))"
