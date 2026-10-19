-- Enable pgvector and store 384-dim embeddings for RAG source chunks.
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE "SourceChunk" ADD COLUMN IF NOT EXISTS embedding vector(384);
CREATE INDEX IF NOT EXISTS "SourceChunk_embedding_idx" ON "SourceChunk" USING hnsw (embedding vector_cosine_ops);
