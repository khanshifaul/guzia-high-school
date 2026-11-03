-- RAG throughput: indexed keyword arm + idempotent re-ingest.
--
-- 1. The keyword arm ranked to_tsvector('simple', content) inside WHERE and
--    ORDER BY, so every query re-parsed every chunk and no index could serve
--    it. A stored generated column + GIN index turns that into an index scan.
--    The expression is immutable because the config is named explicitly.
ALTER TABLE "SourceChunk"
    ADD COLUMN IF NOT EXISTS "searchVector" tsvector
    GENERATED ALWAYS AS (to_tsvector('simple', "content")) STORED;

CREATE INDEX IF NOT EXISTS "SourceChunk_searchVector_idx"
    ON "SourceChunk" USING GIN ("searchVector");

-- 2. Content hash per document: re-ingesting an unchanged chunk reuses its
--    vector instead of calling the embedding model again. Nullable so rows
--    written before this migration stay valid (NULLs do not collide in a
--    unique index); a backfill/reindex fills them as chunks are re-embedded.
ALTER TABLE "SourceChunk" ADD COLUMN IF NOT EXISTS "contentHash" text;

CREATE UNIQUE INDEX IF NOT EXISTS "SourceChunk_documentId_contentHash_key"
    ON "SourceChunk" ("documentId", "contentHash");
