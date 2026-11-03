// src/ai/sources/embedding-cache.util.spec.ts — LRU bounds, TTL and key shape.
import { EmbeddingCache, normalizeQuestion } from './embedding-cache.util';

describe('EmbeddingCache', () => {
    it('returns a stored vector under the same normalized question', () => {
        const cache = new EmbeddingCache(10, 60_000);
        cache.set(normalizeQuestion('What is Photosynthesis?'), [1, 2, 3]);

        expect(cache.get(normalizeQuestion('  what is   photosynthesis?  '))).toEqual([1, 2, 3]);
    });

    it('evicts the least recently used entry when full', () => {
        const cache = new EmbeddingCache(2, 60_000);
        cache.set('a', [1]);
        cache.set('b', [2]);
        cache.get('a'); // touch a, so b is now least recently used
        cache.set('c', [3]);

        expect(cache.get('a')).toEqual([1]);
        expect(cache.get('b')).toBeUndefined();
        expect(cache.get('c')).toEqual([3]);
        expect(cache.size).toBe(2);
    });

    it('expires an entry after the TTL and reports a miss', () => {
        let now = 1_000;
        const cache = new EmbeddingCache(10, 500, () => now);
        cache.set('a', [1]);

        now = 1_499;
        expect(cache.get('a')).toEqual([1]);

        now = 1_500;
        expect(cache.get('a')).toBeUndefined();
        expect(cache.size).toBe(0);
    });

    it('keeps the vector on a repeated set (last write wins)', () => {
        const cache = new EmbeddingCache(10, 60_000);
        cache.set('a', [1]);
        cache.set('a', [9]);

        expect(cache.get('a')).toEqual([9]);
        expect(cache.size).toBe(1);
    });
});

describe('normalizeQuestion', () => {
    it('ignores case, surrounding space and repeated whitespace', () => {
        expect(normalizeQuestion('  What DOES  the cell\nneed? ')).toBe('what does the cell need?');
    });
});
