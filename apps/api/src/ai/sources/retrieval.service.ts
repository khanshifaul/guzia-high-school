// src/ai/sources/retrieval.service.ts — notebook-level retrieval across every
// source a teacher owns. `SourceChunk.embedding` is an
// Unsupported("vector(384)") column that Prisma Client does not expose, so
// reads/writes of vectors go through raw SQL; everything else is typed.
//
// The keyword arm ranks a stored, indexed tsvector (`SourceChunk."searchVector"`,
// a generated column with a GIN index) instead of building
// to_tsvector('simple', content) inside WHERE and ORDER BY, which forced a
// sequential scan and a re-parse of every chunk per query.
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { contentHashOf } from './chunk.util';
import { EmbeddingCache, normalizeQuestion } from './embedding-cache.util';

export interface RetrievedChunk {
    chunkId: string;
    sourceId: string;
    filename: string;
    page: number | null;
    content: string;
    score: number;
}

/** Minimal chunk shape needed to (re)compute an embedding. */
export interface ChunkRow {
    id: string;
    content: string;
    /** Present on ingest: the document the chunk belongs to (hash skip scope). */
    documentId?: string;
    /** Present on ingest: sha256 of the normalized content. */
    contentHash?: string | null;
}

/** What an embedding sweep actually did. */
export interface EmbedStats {
    /** Rows that received a freshly computed vector. */
    embedded: number;
    /** Rows whose vector was copied from a chunk with the same hash. */
    reused: number;
    /** Identical texts collapsed into one model call. */
    deduped: number;
}

const DEFAULT_TOP_K = 6;
/** Each arm fetches a wider pool; fusion then trims to topK. */
const VECTOR_POOL = 20;
const KEYWORD_POOL = 20;
/** Reciprocal-rank-fusion constant (Cormack et al. use 60). */
const RRF_K = 60;
/** pgvector HNSW search width; the default (40) is too narrow a candidate set. */
const HNSW_EF_SEARCH = (() => {
    const configured = Number(process.env.HNSW_EF_SEARCH ?? 64);
    return Number.isFinite(configured) ? Math.min(Math.max(Math.trunc(configured), 1), 1000) : 64;
})();
/** Query-embedding memo: bounded LRU, 10-minute TTL. */
const CACHE_MAX_ENTRIES = 100;
const CACHE_TTL_MS = 10 * 60 * 1000;
/**
 * Function words that occur in almost every chunk. Left in the OR query they
 * drown the rare term ("what does naksha mean" ranked the definition 6th).
 */
const STOPWORDS = new Set([
    'a', 'about', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'did', 'do', 'does',
    'for', 'from', 'how', 'in', 'is', 'it', 'of', 'on', 'or', 'the', 'this',
    'that', 'to', 'was', 'were', 'what', 'when', 'where', 'which', 'who', 'why',
    'with', 'কি', 'কী', 'কেন', 'কিভাবে', 'কোন', 'এবং', 'এর', 'এই', 'ও', 'একটি',
]);
/** Safety cap for a single backfill sweep. */
const BACKFILL_LIMIT = 5000;
/** One UPDATE carries at most this many vectors. */
const WRITE_CHUNK = 500;

const ZERO_STATS: EmbedStats = { embedded: 0, reused: 0, deduped: 0 };

@Injectable()
export class RetrievalService {
    private readonly logger = new Logger(RetrievalService.name);
    private readonly queryCache = new EmbeddingCache(CACHE_MAX_ENTRIES, CACHE_TTL_MS);

    constructor(
        private readonly prisma: DatabaseService,
        private readonly embeddings: EmbeddingsService,
    ) {}

    /**
     * Hybrid search over the teacher's chunks: cosine similarity on the
     * vectors, plus Postgres full-text ranking on the same rows, merged with
     * reciprocal rank fusion. Vectors alone miss exact tokens (a name, "Lesson
     * 3", a formula); full text alone misses paraphrases. Both arms share the
     * same filters.
     */
    async retrieve(
        teacherId: string,
        question: string,
        opts: {
            classId?: string;
            subjectId?: string;
            sourceId?: string;
            workspaceId?: string;
            topK?: number;
        } = {},
    ): Promise<RetrievedChunk[]> {
        const topK = opts.topK ?? DEFAULT_TOP_K;
        const pool = Math.max(topK * 4, VECTOR_POOL);
        const [vectorHits, keywordHits] = await Promise.all([
            this.vectorSearch(teacherId, question, opts, pool),
            this.keywordSearch(teacherId, question, opts, Math.max(pool, KEYWORD_POOL)).catch(
                (err: unknown) => {
                    this.logger.warn(
                        `Keyword search failed, using vectors only: ${(err as Error).message}`,
                    );
                    return [] as RetrievedChunk[];
                },
            ),
        ]);
        return fuseHits(vectorHits, keywordHits, topK);
    }

    /**
     * Vector arm: nearest neighbours by cosine distance. `hnsw.ef_search` is
     * set per transaction — the GUC is a search-time knob, so it must not leak
     * from one request into another on a pooled connection.
     */
    async vectorSearch(
        teacherId: string,
        question: string,
        opts: { classId?: string; subjectId?: string; sourceId?: string; workspaceId?: string },
        limit: number,
    ): Promise<RetrievedChunk[]> {
        const embedding = await this.queryEmbedding(question);
        const vector = `[${embedding.join(',')}]`;
        const classId = opts.classId ?? null;
        const subjectId = opts.subjectId ?? null;
        const sourceId = opts.sourceId ?? null;
        const workspaceId = opts.workspaceId ?? null;

        return this.prisma.$transaction(async (tx) => {
            await tx.$queryRaw`SELECT set_config('hnsw.ef_search', ${String(HNSW_EF_SEARCH)}, true)`;
            return tx.$queryRaw<RetrievedChunk[]>`
                SELECT c.id AS "chunkId", d.id AS "sourceId", d.filename, c.page, c.content,
                       1 - (c.embedding <=> ${vector}::vector) AS score
                FROM "SourceChunk" c
                JOIN "SourceDocument" d ON d.id = c."documentId"
                WHERE d."teacherId" = ${teacherId}
                  AND c.embedding IS NOT NULL
                  AND (${classId}::text IS NULL OR d."classId" = ${classId})
                  AND (${subjectId}::text IS NULL OR d."subjectId" = ${subjectId})
                  AND (${sourceId}::text IS NULL OR d.id = ${sourceId})
                  AND (${workspaceId}::text IS NULL OR EXISTS (
                      SELECT 1 FROM "WorkspaceSource" ws
                      WHERE ws."sourceId" = d.id AND ws."workspaceId" = ${workspaceId}
                  ))
                ORDER BY c.embedding <=> ${vector}::vector
                LIMIT CAST(${limit} AS integer)
            `;
        });
    }

    /** Cached embedding for a normalized question (cold call = one model call). */
    private async queryEmbedding(question: string): Promise<number[]> {
        const key = normalizeQuestion(question);
        const cached = this.queryCache.get(key);
        if (cached) return cached;
        const vector = await this.embeddings.embedOne(question);
        this.queryCache.set(key, vector);
        return vector;
    }

    /**
     * Keyword arm: OR the question's words (the `simple` config keeps names,
     * numbers and Bangla intact) and rank by term coverage and density. Both
     * sides read the generated `searchVector` column, so the GIN index is usable.
     */
    async keywordSearch(
        teacherId: string,
        question: string,
        opts: { classId?: string; subjectId?: string; sourceId?: string; workspaceId?: string },
        limit: number,
    ): Promise<RetrievedChunk[]> {
        const terms = question
            .toLowerCase()
            .split(/[^\p{L}\p{N}]+/u)
            .filter((term) => term.length > 1 && !STOPWORDS.has(term))
            .slice(0, 12);
        if (terms.length === 0) return [];

        const query = terms.join(' | ');
        const classId = opts.classId ?? null;
        const subjectId = opts.subjectId ?? null;
        const sourceId = opts.sourceId ?? null;
        const workspaceId = opts.workspaceId ?? null;

        return this.prisma.$queryRaw<RetrievedChunk[]>`
            SELECT c.id AS "chunkId", d.id AS "sourceId", d.filename, c.page, c.content,
                   ts_rank_cd(c."searchVector", to_tsquery('simple', ${query})) AS score
            FROM "SourceChunk" c
            JOIN "SourceDocument" d ON d.id = c."documentId"
            WHERE d."teacherId" = ${teacherId}
              AND c."searchVector" @@ to_tsquery('simple', ${query})
              AND (${classId}::text IS NULL OR d."classId" = ${classId})
              AND (${subjectId}::text IS NULL OR d."subjectId" = ${subjectId})
              AND (${sourceId}::text IS NULL OR d.id = ${sourceId})
              AND (${workspaceId}::text IS NULL OR EXISTS (
                  SELECT 1 FROM "WorkspaceSource" ws
                  WHERE ws."sourceId" = d.id AND ws."workspaceId" = ${workspaceId}
              ))
            ORDER BY score DESC
            LIMIT CAST(${limit} AS integer)
        `;
    }

    /** Best-effort embedding for freshly ingested chunks; never throws. */
    async embedChunks(rows: ChunkRow[]): Promise<EmbedStats> {
        if (rows.length === 0) return { ...ZERO_STATS };
        try {
            return await this.persistEmbeddings(rows);
        } catch (err) {
            this.logger.warn(
                `Embedding ${rows.length} chunk(s) failed: ${(err as Error).message}`,
            );
            return { ...ZERO_STATS };
        }
    }

    /** Embed every chunk that has no vector yet (optionally for one teacher). */
    async backfillMissing(teacherId?: string): Promise<{ embedded: number }> {
        const scope = teacherId ?? null;
        const rows = await this.prisma.$queryRaw<ChunkRow[]>`
            SELECT c.id, c.content, c."documentId", c."contentHash"
            FROM "SourceChunk" c
            JOIN "SourceDocument" d ON d.id = c."documentId"
            WHERE c.embedding IS NULL
              AND (${scope}::text IS NULL OR d."teacherId" = ${scope})
            ORDER BY c.id
            LIMIT CAST(${BACKFILL_LIMIT} AS integer)
        `;
        if (rows.length === 0) return { embedded: 0 };

        try {
            return { embedded: (await this.persistEmbeddings(rows)).embedded };
        } catch (err) {
            this.logger.warn(
                `Backfill embedding failed for ${rows.length} chunk(s): ${(err as Error).message}`,
            );
            return { embedded: 0 };
        }
    }

    /**
     * Batch-embed and store vectors; returns what the sweep did.
     *
     * Three layers of avoidance, cheapest first:
     * 1. a chunk whose (document, contentHash) already has a vector copies it —
     *    a re-ingest of the same document makes zero model calls;
     * 2. identical texts within the sweep share one vector (`EmbeddingsService`
     *    dedupes, and the hash bucket here fans it out without a second call);
     * 3. vectors are written one UPDATE per batch, not one per chunk.
     */
    private async persistEmbeddings(rows: ChunkRow[]): Promise<EmbedStats> {
        const keyed = rows.map((row) => ({
            row,
            docId: row.documentId ?? null,
            hash: row.contentHash ?? contentHashOf(row.content),
        }));

        // 1. Vectors already stored for the same document + hash.
        const docIds = [
            ...new Set(keyed.map((entry) => entry.docId).filter((id): id is string => id !== null)),
        ];
        const hashes = [...new Set(keyed.map((entry) => entry.hash))];
        const reusedVectors = new Map<string, string>();
        if (docIds.length > 0 && hashes.length > 0) {
            const existing = await this.prisma.$queryRaw<
                { documentId: string; contentHash: string; embeddingText: string }[]
            >`
                SELECT "documentId", "contentHash", embedding::text AS "embeddingText"
                FROM "SourceChunk"
                WHERE embedding IS NOT NULL
                  AND "documentId" = ANY(${docIds}::text[])
                  AND "contentHash" = ANY(${hashes}::text[])
            `;
            for (const row of existing) {
                reusedVectors.set(`${row.documentId}\u0000${row.contentHash}`, row.embeddingText);
            }
        }

        const pending = new Map<string, { text: string; ids: string[] }>();
        const updates: { id: string; vector: string; fresh: boolean }[] = [];
        let reused = 0;
        let deduped = 0;

        for (const { row, docId, hash } of keyed) {
            const stored = docId === null ? undefined : reusedVectors.get(`${docId}\u0000${hash}`);
            if (stored) {
                updates.push({ id: row.id, vector: stored, fresh: false });
                reused += 1;
                continue;
            }

            const bucket = pending.get(hash);
            if (bucket) {
                bucket.ids.push(row.id);
                deduped += 1;
            } else {
                pending.set(hash, { text: row.content, ids: [row.id] });
            }
        }

        // 2. One model call per distinct text; fan the vector out to every id.
        if (pending.size > 0) {
            const buckets = [...pending.values()];
            const vectors = await this.embeddings.embed(buckets.map((bucket) => bucket.text));
            buckets.forEach((bucket, index) => {
                const vector = vectors[index];
                if (!vector) return;
                const literal = `[${vector.join(',')}]`;
                for (const id of bucket.ids) updates.push({ id, vector: literal, fresh: true });
            });
        }

        // 3. One statement per batch of vectors.
        let embedded = 0;
        for (let offset = 0; offset < updates.length; offset += WRITE_CHUNK) {
            const slice = updates.slice(offset, offset + WRITE_CHUNK);
            const ids = slice.map((entry) => entry.id);
            const literals = slice.map((entry) => entry.vector);
            try {
                await this.prisma.$executeRaw`
                    UPDATE "SourceChunk" AS c
                    SET embedding = v.vec::vector
                    FROM (
                        SELECT unnest(${ids}::text[]) AS id, unnest(${literals}::text[]) AS vec
                    ) AS v
                    WHERE c.id = v.id
                `;
                embedded += slice.filter((entry) => entry.fresh).length;
            } catch (err) {
                this.logger.warn(
                    `Could not store ${slice.length} embedding(s): ${(err as Error).message}`,
                );
            }
        }

        return { embedded, reused, deduped };
    }
}

/**
 * Reciprocal rank fusion: a chunk's score is the sum of 1/(K + rank) over the
 * lists it appears in, so agreement between the arms wins. The returned
 * `score` is that fused rank; consumers only use it for ordering.
 */
export function fuseHits(
    vectorHits: RetrievedChunk[],
    keywordHits: RetrievedChunk[],
    topK: number,
): RetrievedChunk[] {
    const fused = new Map<string, RetrievedChunk>();
    const add = (hits: RetrievedChunk[]) => {
        hits.forEach((hit, index) => {
            const contribution = 1 / (RRF_K + index + 1);
            const existing = fused.get(hit.chunkId);
            if (existing) existing.score += contribution;
            else fused.set(hit.chunkId, { ...hit, score: contribution });
        });
    };
    add(vectorHits);
    add(keywordHits);
    return [...fused.values()].sort((a, b) => b.score - a.score).slice(0, topK);
}
