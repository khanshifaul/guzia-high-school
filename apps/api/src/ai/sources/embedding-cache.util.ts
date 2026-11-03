// src/ai/sources/embedding-cache.util.ts — bounded LRU for query vectors.
//
// A teacher asks a question, then asks it again (or asks a follow-up phrased
// the same way). The embedding of the question is the one part of retrieval
// that costs a model call, so it is memoised by the normalized question:
// whitespace and case must not miss the cache. Bounded at 100 entries with a
// 10-minute TTL so a changed model never serves a stale vector forever.
const DEFAULT_MAX_ENTRIES = 100;
const DEFAULT_TTL_MS = 10 * 60 * 1000;

interface CacheEntry {
    vector: number[];
    expiresAt: number;
}

/** Case- and whitespace-insensitive cache key. */
export function normalizeQuestion(question: string): string {
    return question.toLowerCase().replace(/\s+/g, ' ').trim();
}

export class EmbeddingCache {
    private readonly entries = new Map<string, CacheEntry>();

    constructor(
        private readonly maxEntries: number = DEFAULT_MAX_ENTRIES,
        private readonly ttlMs: number = DEFAULT_TTL_MS,
        private readonly now: () => number = Date.now,
    ) {}

    get size(): number {
        return this.entries.size;
    }

    get(key: string): number[] | undefined {
        const entry = this.entries.get(key);
        if (!entry) return undefined;
        if (entry.expiresAt <= this.now()) {
            this.entries.delete(key);
            return undefined;
        }
        // Touch: re-insert so Map iteration order stays least-recently-used first.
        this.entries.delete(key);
        this.entries.set(key, entry);
        return entry.vector;
    }

    set(key: string, vector: number[]): void {
        this.entries.delete(key);
        this.entries.set(key, { vector, expiresAt: this.now() + this.ttlMs });
        while (this.entries.size > this.maxEntries) {
            const oldest = this.entries.keys().next().value;
            if (oldest === undefined) break;
            this.entries.delete(oldest);
        }
    }

    clear(): void {
        this.entries.clear();
    }
}
