// src/ai/sources/chunk.util.spec.ts — windowing and the content hash contract.
import { CHUNK_CHARS, CHUNK_OVERLAP, chunkPages, contentHashOf, normalizeChunkText } from './chunk.util';

describe('chunkPages', () => {
    it('keeps short pages as one chunk with their page number', () => {
        const chunks = chunkPages([{ page: 3, text: 'short page' }]);
        expect(chunks).toEqual([{ page: 3, text: 'short page' }]);
    });

    it('splits a long page with a CHUNK_OVERLAP overlap and no gap', () => {
        const text = 'x'.repeat(CHUNK_CHARS + 400);
        const chunks = chunkPages([{ page: 1, text }]);

        expect(chunks.length).toBe(2);
        expect(chunks[0].text.length).toBe(CHUNK_CHARS);
        expect(chunks[1].text.length).toBe(400 + CHUNK_OVERLAP);
        // The overlap is the tail of the first chunk.
        expect(text.slice(0, CHUNK_CHARS).endsWith(chunks[1].text.slice(0, CHUNK_OVERLAP))).toBe(true);
    });

    it('chunks each page independently', () => {
        const chunks = chunkPages([
            { page: 1, text: 'a'.repeat(CHUNK_CHARS + 1) },
            { page: 2, text: 'b' },
        ]);
        expect(chunks.map((chunk) => chunk.page)).toEqual([1, 1, 2]);
    });
});

describe('contentHashOf', () => {
    it('is stable and ignores whitespace differences', () => {
        expect(contentHashOf('hello   world')).toBe(contentHashOf('hello world'));
        expect(contentHashOf(' hello\nworld ')).toBe(contentHashOf('hello world'));
    });

    it('separates different text', () => {
        expect(contentHashOf('hello world')).not.toBe(contentHashOf('hello worlds'));
    });

    it('normalizes to a single-spaced trimmed string', () => {
        expect(normalizeChunkText(' a\n\n b\tc ')).toBe('a b c');
    });
});
