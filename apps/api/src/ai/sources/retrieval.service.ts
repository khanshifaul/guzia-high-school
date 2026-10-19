// src/ai/sources/retrieval.service.ts — notebook-level retrieval across every
// source a teacher owns. `SourceChunk.embedding` is an
// Unsupported("vector(384)") column that Prisma Client does not expose, so
// reads/writes of vectors go through raw SQL; everything else is typed.
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';

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
}

const DEFAULT_TOP_K = 6;
/** Each arm fetches a wider pool; fusion then trims to topK. */
const VECTOR_POOL = 20;
const KEYWORD_POOL = 20;
/** Reciprocal-rank-fusion constant (Cormack et al. use 60). */
const RRF_K = 60;
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

@Injectable()
export class RetrievalService {
    private readonly logger = new Logger(RetrievalService.name);

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

    /** Vector arm: nearest neighbours by cosine distance. */
    private async vectorSearch(
        teacherId: string,
        question: string,
        opts: { classId?: string; subjectId?: string; sourceId?: string; workspaceId?: string },
        limit: number,
    ): Promise<RetrievedChunk[]> {
        const embedding = await this.embeddings.embedOne(question);
        const vector = `[${embedding.join(',')}]`;
        const classId = opts.classId ?? null;
        const subjectId = opts.subjectId ?? null;
        const sourceId = opts.sourceId ?? null;
        const workspaceId = opts.workspaceId ?? null;

        return this.prisma.$queryRaw<RetrievedChunk[]>`
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
    }

    /**
     * Keyword arm: OR the question's words (the `simple` config keeps names,
     * numbers and Bangla intact) and rank by term coverage and density.
     */
    private async keywordSearch(
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
                   ts_rank_cd(to_tsvector('simple', c.content), to_tsquery('simple', ${query})) AS score
            FROM "SourceChunk" c
            JOIN "SourceDocument" d ON d.id = c."documentId"
            WHERE d."teacherId" = ${teacherId}
              AND to_tsvector('simple', c.content) @@ to_tsquery('simple', ${query})
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
    async embedChunks(rows: ChunkRow[]): Promise<void> {
        if (rows.length === 0) return;
        try {
            await this.persistEmbeddings(rows);
        } catch (err) {
            this.logger.warn(
                `Embedding ${rows.length} chunk(s) failed: ${(err as Error).message}`,
            );
        }
    }

    /** Embed every chunk that has no vector yet (optionally for one teacher). */
    async backfillMissing(teacherId?: string): Promise<{ embedded: number }> {
        const scope = teacherId ?? null;
        const rows = await this.prisma.$queryRaw<ChunkRow[]>`
            SELECT c.id, c.content
            FROM "SourceChunk" c
            JOIN "SourceDocument" d ON d.id = c."documentId"
            WHERE c.embedding IS NULL
              AND (${scope}::text IS NULL OR d."teacherId" = ${scope})
            ORDER BY c.id
            LIMIT CAST(${BACKFILL_LIMIT} AS integer)
        `;
        if (rows.length === 0) return { embedded: 0 };

        try {
            return { embedded: await this.persistEmbeddings(rows) };
        } catch (err) {
            this.logger.warn(
                `Backfill embedding failed for ${rows.length} chunk(s): ${(err as Error).message}`,
            );
            return { embedded: 0 };
        }
    }

    /** Batch-embed and store vectors; returns the number actually written. */
    private async persistEmbeddings(rows: ChunkRow[]): Promise<number> {
        const vectors = await this.embeddings.embed(rows.map((row) => row.content));
        let embedded = 0;

        for (let i = 0; i < rows.length; i += 1) {
            const row = rows[i];
            const vector = vectors[i];
            if (!row || !vector) continue;

            try {
                const literal = `[${vector.join(',')}]`;
                await this.prisma.$executeRaw`
                    UPDATE "SourceChunk"
                    SET embedding = ${literal}::vector
                    WHERE id = ${row.id}
                `;
                embedded += 1;
            } catch (err) {
                this.logger.warn(
                    `Could not store embedding for chunk ${row.id}: ${(err as Error).message}`,
                );
            }
        }

        return embedded;
    }
}

/**
 * Reciprocal rank fusion: a chunk's score is the sum of 1/(K + rank) over the
 * lists it appears in, so agreement between the arms wins. The returned
 * `score` is that fused rank; consumers only use it for ordering.
 */
function fuseHits(
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
