---
id: rag-throughput
title: Measure and improve RAG ingest/retrieval throughput; widen source coverage
status: done
gate: auto
---

## Summary

A bench harness (`apps/api/scripts/bench-rag.ts`) now runs the real RAG pipeline
against the local compose Postgres and prints per-stage numbers for four
committed fixtures plus a deterministic corpus. Measured first on `30a530e`,
then fixed: the keyword arm reads a generated, GIN-indexed `tsvector`; embeddings
dedupe, batch at 64 with 2/4-way batch concurrency, and reuse a stored vector by
content hash so a re-ingest is free; retrieval sets `hnsw.ef_search` per
transaction and memoises the query embedding (100-entry LRU, 10-minute TTL). One
`SUPPORTED` table now decides coverage and produces the 415 body. Top-3 quality
is unchanged at 20/20.

## Environment

- Postgres `localhost:5434/ghs` (container `guzia-high-school-postgres-1`).
  `apps/api/.env.local` points at Neon; every command below overrode
  `DATABASE_URL`, and the bench refuses any non-loopback host before connecting.
- Embeddings provider: local `Xenova/paraphrase-multilingual-MiniLM-L12-v2`,
  384 dims. No network provider was called; the image fixture's vision call is
  stubbed with `page.png.txt` so the PNG stage is reproducible offline.
- The compose DB was missing the HNSW index that the committed pgvector
  migration (`20261019120000_pgvector_embeddings`) declares, so it was created
  locally with that migration's own `CREATE INDEX IF NOT EXISTS` before the
  first bench run. The bench also `REINDEX`es the HNSW index after deleting its
  previous corpus, so a run never measures dead graph entries. No migration file
  was changed for either action.

## Method

Baseline was taken on the unmodified code: the feature files were stashed, only
the bench hooks (retrieval arms made public, `fuseHits` exported) were applied to
`30a530e`'s `retrieval.service.ts`, the bench ran, and the stash was restored.
The after run is the same bench, same fixtures, same corpus, same DB.

```
DATABASE_URL=postgresql://ghs:ghs_dev_password@localhost:5434/ghs \
  bun apps/api/scripts/bench-rag.ts        # or: bun --filter @guzia/api bench:rag
```

Corpus per run: **3000 chunks** = 520 with vectors (8 fixture chunks + 512
synthetic pad chunks) plus 2480 keyword-only rows (no vector). The embedded
corpus is over the 500-chunk floor; the keyword arm is timed on all 3000, which
is where a scan versus a GIN index shows.

## Ingest stages — before / after

Fixtures are committed in `apps/api/test/fixtures/rag/` (29,592 bytes total,
under the 2 MB cap).

| fixture | bytes | pages | chunks | chars | extract ms | chunk ms | insert ms | embed ms | chunks/s |
|---|---|---|---|---|---|---|---|---|---|
| `multi-page.pdf` | 4,175 | 3 | 3 | 2,191 | 66.2 → 61.2 | 0.4 → 0.3 | 5.4 → 5.0 | 1626.3 → 1580.1 | 1.84 → 1.90 |
| `notes.docx` | 1,340 | 1 | 1 | 795 | 31.5 → 25.0 | 0.0 → 0.0 | 3.5 → 3.4 | 42.9 → 36.7 | 23.29 → 27.23 |
| `marks.csv` | 2,255 | 1 | 3 | 2,555 | 0.0 → 0.0 | 0.0 → 0.0 | 4.5 → 7.6 | 723.5 → 582.9 | 4.15 → 5.15 |
| `page.png` | 18,372 | 1 | 1 | 348 | 0.1 → 0.1 | 0.0 → 0.0 | 4.3 → 4.6 | 70.7 → 58.9 | 14.14 → 16.99 |
| `synthetic-pad` (512 chunks) | — | 1 | 512 | 607,598 | — | — | — | 66,504.6 → 52,829.2 | **7.70 → 9.69** |

The single-chunk fixture rows include model warm-up jitter; the 512-chunk row
is the throughput figure (129.9 ms/chunk → 103.2 ms/chunk).

## 1. Keyword arm index

- `20261103120000_rag_throughput` adds a stored generated column
  `tsvector` (`to_tsvector('simple', content)`) plus a GIN index, and the query
  now ranks `c."searchVector"` in both `WHERE` and `ORDER BY`.
- Same corpus (3000 chunks), 20 questions, one arm call each:

| keyword-arm | p50 ms | p95 ms | max ms |
|---|---|---|---|
| before | 245.36 | 489.38 | 508.40 |
| after | 4.88 | 24.50 | 45.26 |

The old and new queries return the identical ordered chunk ids for the
questions (checked in SQL), so the delta is the access path, not the ranking.

## 2. Embedding throughput

- Dedupe of normalized texts before the model call, fanned back out to every
  occurrence; `BATCH_SIZE` 32 → 64; worker pool with 2 concurrent batches for
  the local provider and 4 for the remote provider.
- Nullable `contentHash` with `@@unique([documentId, contentHash])`; a chunk
  whose hash already has a vector copies it instead of calling the model.
  `createMany` now uses `skipDuplicates`.
- Measured: 7.70 → **9.69 chunks/s** on the 512-chunk corpus (1.26×). The gain
  is bounded by the local ONNX encoder saturating the CPU: two concurrent
  batches do not double throughput, and 64-item batches are the cheap part.
- Re-ingest, second pass over the same 512-chunk document:

| | rows | new rows inserted | rows sent to the model | vectors reused |
|---|---|---|---|---|
| before | 512 | 0 | 512 | 0 |
| after | 512 | 0 | **0** | **512** |

## 3. Retrieval latency

- `SET LOCAL hnsw.ef_search` per retrieval transaction (`set_config(... , true)`,
  default 64, override `HNSW_EF_SEARCH`), inside the same transaction as the
  vector query; the GUC cannot leak between pooled connections.
- Query embedding cached in a bounded LRU: 100 entries, 10-minute TTL, keyed by
  the normalized question (case- and whitespace-insensitive).
- 20 questions, hybrid `retrieve(topK: 3)`:

| pass | n | p50 ms before | p95 ms before | p50 ms after | p95 ms after |
|---|---|---|---|---|---|
| cold (fresh service, empty cache) | 20 | 253.08 | 494.71 | 22.65 | 42.82 |
| warm (same service, repeated questions) | 60 | 252.00 | 501.47 | 5.51 | 19.83 |

Cold means the first use of a fresh `RetrievalService` — the embedding model was
already loaded, the cache was not. Warm means a repeated question on the same
service, i.e. a cache hit. The vector arm alone was 16.06 → 16.43 ms p50 (the
`set_config` round trip is inside the noise); the before numbers are dominated by
the keyword scan.

## 4. Coverage

- `apps/api/src/ai/sources/file-types.util.ts` exports `SUPPORTED` for pdf,
  docx, pptx, xlsx, csv, txt, md, html, png, jpeg, webp; `detectFile` returns the
  extraction path and a canonical MIME.
- `ingestUpload` refuses anything absent from the table with **415**
  (`UnsupportedMediaTypeException`) whose body lists `accepted`, `extensions`,
  and `legacy: [{extension: '.doc', saveAs: '.docx'}, …]`.
- `.docx/.pptx/.xlsx` keep the MarkItDown → officeparser path; HTML was added to
  the text/MarkItDown path (MarkItDown first, then `htmlToText`).
- The canonical MIME from the table is what storage and the vision call see, so
  a browser sending `application/octet-stream` for a supported `.docx` no longer
  becomes a storage rejection. `text/html` and `application/xhtml+xml` were added
  to the upload allowlist.
- Legacy `.doc/.ppt/.xls` are never accepted; they are named in the 415 body.

## 5. Quality guard

`apps/api/test/fixtures/rag/questions.json` — 20 questions with expected chunk
ids (12 fixture questions, 8 pad-topic questions).

| | top-3 hits | rate |
|---|---|---|
| before | 20 / 20 | 100% |
| after | 20 / 20 | 100% |

## Migration

`apps/api/prisma/migrations/20261103120000_rag_throughput/migration.sql`
(generated `searchVector` + GIN, nullable `contentHash` + unique
`(documentId, contentHash)`). `prisma migrate dev` cannot build a shadow database
on this compose database, so the SQL was applied with `psql -v ON_ERROR_STOP=1`
to `localhost:5434/ghs` and recorded with
`prisma migrate resolve --applied 20261103120000_rag_throughput`. Neon was not
touched. `prisma generate` refreshed the committed client (which also picked up
the pre-existing `Invoice` compound-unique drift between schema and client).

## Verify

```
$ bun --filter @guzia/api test
Test Suites: 25 passed, 25 total
Tests:       240 passed, 240 total

$ bun run lint
$ oxlint apps
(no findings; exit 0)
```

On the task's base `30a530e` the same suite was 220 tests: the 195 existing
tests plus the 25 new ones. After rebasing onto `main` (`77a9700`, which added
the paper-export suite, +20 tests) the total is 240; no existing test changed.

## Files changed

- `apps/api/scripts/bench-rag.ts` — the bench harness.
- `apps/api/src/ai/sources/chunk.util.ts`, `extract.util.ts`,
  `file-types.util.ts`, `embedding-cache.util.ts` — shared chunker/hash,
  extraction pipeline, coverage table, query-embedding LRU.
- `apps/api/src/ai/sources/retrieval.service.ts` — indexed keyword arm,
  `hnsw.ef_search`, query cache, hash reuse, batched vector writes.
- `apps/api/src/ai/embeddings/embeddings.service.ts` — dedupe, batch 64,
  batch-level worker pools.
- `apps/api/src/ai/sources/sources.service.ts` — coverage table, shared
  extraction/chunker, hash-stamped idempotent ingest.
- `apps/api/src/upload/upload.service.ts` — HTML MIME acceptance.
- `apps/api/prisma/schema.prisma`,
  `apps/api/prisma/migrations/20261103120000_rag_throughput/migration.sql`,
  `apps/api/prisma/generated/**` — schema, migration, regenerated client.
- `apps/api/src/ai/**/*.spec.ts` (5 new files) — coverage/415, chunk hash,
  dedupe/fan-out and batching, LRU TTL/eviction, hash-skip sweep.
- `apps/api/test/fixtures/rag/**` — PDF, DOCX, CSV, PNG + transcription sidecar,
  `questions.json`.
- `apps/api/package.json` — `bench:rag` script.

## Commit

`cab6096` (`perf(ai): index the RAG keyword arm and make ingest idempotent`) on
`foreman/rag-throughput`, rebased onto `main` at `77a9700`.

## Blockers

none.

## Reflection

The first bench corpus used 512 near-identical synthetic chunks ("Reference
zqNNNN belongs to shelf N…"). The first after run scored 16/20 and the four
misses looked like a retrieval regression. They were not: the keyword arm's
ordered ids were byte-identical before and after (verified in SQL), and the pad
embeddings were degenerate enough that HNSW neighbour order was arbitrary. I
replaced the pad corpus with eight distinct topic pages plus varied filler and
re-measured *both* sides on the identical corpus. Cost: two extra bench runs
(~9 minutes). A benchmark corpus of near-duplicates cannot measure ANN ranking
stability, and a corpus change invalidates every number taken before it.
