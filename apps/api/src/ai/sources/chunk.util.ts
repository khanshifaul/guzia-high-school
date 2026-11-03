// src/ai/sources/chunk.util.ts — one chunker, shared by ingest and the bench.
//
// Pages are split into ~1200-char windows with a 150-char overlap so a fact
// that straddles a boundary is still whole in one chunk. The same module owns
// the content hash: the hash is what makes a re-ingest idempotent, so it must
// be computed exactly where the chunk is created, never re-derived downstream.
import { createHash } from 'node:crypto';
import type { PageText } from './text-clean.util';

export const CHUNK_CHARS = 1200;
export const CHUNK_OVERLAP = 150;

/** Chunk page-tagged text into ~1200-char windows with overlap. */
export function chunkPages(pages: PageText[]): PageText[] {
    const out: PageText[] = [];
    for (const page of pages) {
        let start = 0;
        while (start < page.text.length) {
            const end = Math.min(start + CHUNK_CHARS, page.text.length);
            out.push({ page: page.page, text: page.text.slice(start, end) });
            if (end >= page.text.length) break;
            start = end - CHUNK_OVERLAP;
        }
    }
    return out;
}

/**
 * Whitespace-insensitive form used for the hash. Two chunks that differ only
 * in line wrapping are the same text for retrieval purposes.
 */
export function normalizeChunkText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}

/** Stable content hash: sha256 of the normalized chunk text (hex). */
export function contentHashOf(text: string): string {
    return createHash('sha256').update(normalizeChunkText(text)).digest('hex');
}
