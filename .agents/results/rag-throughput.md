---
id: rag-throughput
title: Measure and improve RAG ingest/retrieval throughput; widen source coverage
status: done
gate: auto
---

## Summary

A bench harness (`apps/api/scripts/bench-rag.ts`) runs the real RAG pipeline
against the local compose Postgres and prints per-stage numbers for four
committed fixtures plus a deterministic corpus. Measured first on `30a530e`,
then fixed: the keyword arm reads a generated, GIN-indexed `tsvector`; embeddings
dedupe, batch at 64 with 2/4-way batch concurrency, and reuse a stored vector by
content hash so a re-ingest is free; retrieval sets `hnsw.ef_search` per
transaction and memoises the query embedding (100-entry LRU, 10-minute TTL). One
`SUPPORTED` table now decides coverage and produces the 415 body. The quality
guard is scoped to the bench's own corpus and is reproducible: 25/25 passes at
20/20 across five invocations.

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

Baseline was taken on the unmodified code: `apps/api/src` and the Prisma schema
were checked out from `30a530e`, only the bench hooks (retrieval arms made
public, `fuseHits` exported) were applied to `30a530e`'s
`retrieval.service.ts`, the bench ran, and `HEAD` was restored. The after runs
are the same bench, same fixtures, same corpus, same DB.

```
DATABASE_URL=postgresql://ghs:ghs_dev_password@localhost:5434/ghs \
  bun apps/api/scripts/bench-rag.ts        # or: bun --filter @guzia/api bench:rag
```

**Final corpus (3000 chunks).** 520 chunks carry vectors: the 8 fixture chunks
plus a 512-row pad. The pad is 8 distinct topic pages (Library Rules, Sports
Day, Examination Rules, First Aid, Computer Basics, Rivers of Bangladesh, Parts
of Speech, Food and Nutrition — the guard's expected pad chunks) plus 504 filler
rows across eight unrelated topics (workshop, warehouse, seed store, weather
station, bus route, canteen, generator, survey map). Every filler row has its own
token and code and a different sentence order; none of them contains
library/borrowing text. The remaining 2480 rows are keyword-only (no vector) and
use a separate registry/archive vocabulary that shares no word with any guard
question. Corpus rows are re-seeded and the HNSW graph rebuilt on every run.

**Quality scope.** Every bench document carries `classId = "bench-rag-scope"`;
the guard calls `retrieve(..., { classId: 'bench-rag-scope', topK: 3 })`. The
bench asserts by SQL, before the guard, that (a) every row owned by
`bench-rag-teacher` belongs to a `bench-doc:` document and (b) no document in
that classId belongs to another teacher — so the 554 embedded chunks the dev
database holds for a real teacher cannot enter the vector arm. On every run:

```
- rows owned by the bench teacher: 3000
- bench-teacher rows outside bench documents: 0 (must be 0)
- rows in classId "bench-rag-scope" owned by another teacher: 0 (must be 0)
```

## Ingest stages — before / after

Fixtures are committed in `apps/api/test/fixtures/rag/` (29,592 bytes total,
under the 2 MB cap). After numbers are invocation 1 of five (all five in the
reproducibility table).

| fixture | bytes | pages | chunks | chars | extract ms | chunk ms | insert ms | embed ms | chunks/s |
|---|---|---|---|---|---|---|---|---|---|
| `multi-page.pdf` | 4,175 | 3 | 3 | 2,191 | 59.6 → 62.7 | 0.4 → 0.3 | 5.7 → 5.0 | 1501.2 → 1591.3 | 2.00 → 1.89 |
| `notes.docx` | 1,340 | 1 | 1 | 795 | 31.8 → 26.4 | 0.0 → 0.0 | 3.6 → 8.5 | 48.4 → 49.2 | 20.67 → 20.31 |
| `marks.csv` | 2,255 | 1 | 3 | 2,555 | 0.0 → 0.0 | 0.0 → 0.0 | 5.1 → 6.4 | 651.8 → 633.0 | 4.60 → 4.74 |
| `page.png` | 18,372 | 1 | 1 | 348 | 0.1 → 0.1 | 0.0 → 0.0 | 4.1 → 3.6 | 22.8 → 29.7 | 43.83 → 33.70 |
| `synthetic-pad` (512 chunks) | — | 1 | 512 | 607,598 | — | — | — | 58,061.9 → 49,850.7 | **8.82 → 10.27** |

The single-chunk rows include model warm-up jitter; the 512-chunk row is the
throughput figure.

## 1. Keyword arm index

- `20261103120000_rag_throughput` adds a stored generated column
  `tsvector` (`to_tsvector('simple', content)`) plus a GIN index, and the query
  ranks `c."searchVector"` in both `WHERE` and `ORDER BY`.
- Same corpus (3000 chunks), 20 questions, one arm call each:

| keyword-arm | p50 ms | p95 ms | max ms |
|---|---|---|---|
| before | 289.36 | 348.31 | 484.31 |
| after (invocation 1) | 2.56 | 6.54 | 21.32 |

After p50 across the five invocations: 2.56, 1.24, 1.54, 2.65, 1.37 ms. The old
and new queries return the identical ordered chunk ids for the questions
(checked in SQL), so the delta is the access path, not the ranking.

## 2. Embedding throughput

- Dedupe of normalized texts before the model call, fanned back out to every
  occurrence; `BATCH_SIZE` 32 → 64; worker pool with 2 concurrent batches for
  the local provider and 4 for the remote provider.
- Nullable `contentHash` with `@@unique([documentId, contentHash])`; a chunk
  whose hash already has a vector copies it instead of calling the model.
  `createMany` now uses `skipDuplicates`.
- Measured on the 512-chunk pad: **8.82 chunks/s before; 10.27 / 7.88 / 7.63 /
  8.84 / 8.67 after** (median 8.67), i.e. **no reliable throughput gain on this
  machine**. The pad rows are distinct, so dedupe has nothing to collapse, and
  the local ONNX encoder is CPU-bound: two concurrent 64-item batches on one
  machine land inside the run-to-run spread (7.63–10.27). The measured embedding
  win here is idempotency, not throughput.
- Re-ingest, second pass over the same 512-chunk document:

| | rows | new rows inserted | rows sent to the model | vectors reused |
|---|---|---|---|---|
| before | 512 | 0 | 512 | 0 |
| after (all 5 invocations) | 512 | 0 | **0** | **512** |

## 3. Retrieval latency

- `SET LOCAL hnsw.ef_search` per retrieval transaction (`set_config(... , true)`,
  default 64, override `HNSW_EF_SEARCH`), inside the same transaction as the
  vector query; the GUC cannot leak between pooled connections.
- Query embedding cached in a bounded LRU: 100 entries, 10-minute TTL, keyed by
  the normalized question (case- and whitespace-insensitive).
- 20 questions, hybrid `retrieve(topK: 3)`:

| pass | n | p50 ms before | p95 ms before | p50 ms after | p95 ms after |
|---|---|---|---|---|---|
| cold (fresh service, empty cache) | 20 | 294.05 | 350.98 | 26.91 | 44.47 |
| warm (same service, repeated questions) | 60 | 295.21 | 359.36 | 4.50 | 8.01 |

Cold means the first use of a fresh `RetrievalService` — the embedding model was
already loaded, the cache was not. Warm means a repeated question on the same
service, i.e. a cache hit. After cold p50 across the five invocations: 26.91,
21.55, 18.73, 13.87, 18.46 ms; warm: 4.50, 4.76, 4.76, 1.82, 4.66 ms. The
vector arm's p50 moved from 10.75 to 30.85 ms because that arm's time is almost
entirely the per-question model call (it embeds the question); its run-to-run
p50 after was 19.22–30.85 ms. The before C/W numbers are dominated by the
keyword scan.

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

## 5. Quality guard — reproducibility

`apps/api/test/fixtures/rag/questions.json` — 20 questions with expected chunk
ids (12 fixture questions, 8 pad-topic questions). The bench runs the guard five
times inside each invocation, each time with a fresh `RetrievalService` (cold
query cache), scoped to `classId = "bench-rag-scope"`, and fails if any run is
below 20/20 or returns a chunk that is not `bench:`-owned. The whole bench was
then run **five times**, deleting and re-seeding the corpus and rebuilding the
HNSW graph each time.

| bench invocation | guard passes | every pass | foreign chunks |
|---|---|---|---|
| 1 | 5 | 20/20 (100%) | 0 |
| 2 | 5 | 20/20 (100%) | 0 |
| 3 | 5 | 20/20 (100%) | 0 |
| 4 | 5 | 20/20 (100%) | 0 |
| 5 | 5 | 20/20 (100%) | 0 |

25/25 passes at 20/20, 0 foreign chunks. The baseline invocation (before code,
same final corpus and scope) also ran five passes: 20/20, 20/20, 20/20, 20/20,
20/20.

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

- `apps/api/scripts/bench-rag.ts` — the bench harness (final: distinct pad,
  scope assertion, five guard runs).
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
`foreman/rag-throughput`, rebased onto `main` at `77a9700`; this follow-up adds
`test(rag): make the quality guard reproducible`.

## Blockers

none.

## Reflection

The reviewer rejected the first recorded 20/20: two of three reruns returned
19/20, because the pad was 504 repetitions of a library paragraph — the same
topic as the Library Rules answer — and the vector arm's ordering among
near-duplicates is arbitrary, so the fused top-3 moved between runs. The fix
did not touch retrieval: the pad now has eight distinct expected-topic pages and
504 filler rows on eight unrelated topics, the keyword-only rows use a separate
registry vocabulary, and the guard is scoped to the bench's own `classId` with a
pre-run SQL assertion that no other teacher's rows are in scope. Five bench
invocations, five guard passes each: 25/25 at 20/20, 0 foreign chunks. The
lesson already recorded on the previous round still holds and now has a second
instance: a corpus of near-duplicates cannot measure ANN ranking, and a guard
must own its entire retrieval scope.
