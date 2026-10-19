// src/ai/sources/text-clean.util.ts — remove repeated page furniture.
//
// Scans and PDF exports repeat a running head/footer on every page ("English
// For Today", "Food and Nutrition 15", the year, a bare page number). Left in,
// those lines dominate the chunk embeddings, match unrelated questions and
// waste summary tokens. A line is dropped only when it repeats at a page EDGE
// often enough, so body text in the middle of a page is never touched.

export interface PageText {
    page: number;
    text: string;
}

/**
 * A line at a page edge on this many pages is furniture. A running head repeats
 * on every page of its unit, and a unit may be a few pages of a long book, so
 * the bar is low; a genuine heading appears once.
 */
const MIN_PAGES = 3;
const MAX_LINE_CHARS = 80;
const EDGE_LINES = 3;

/** Lowercase, strip leading/trailing numbers and punctuation, collapse space. */
function normalize(line: string): string {
    return line
        .toLowerCase()
        .replace(/^[\s\d.\-–—:|]+/, '')
        .replace(/[\s\d.\-–—:|]+$/, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Pages with running heads, footers and bare page numbers removed. */
export function stripRunningHeads(pages: PageText[]): PageText[] {
    if (pages.length < MIN_PAGES) return pages;

    const lines = pages.map((page) => page.text.split('\n').map((line) => line.trim()));

    // Count the normalized form of each page's first/last few lines. The window
    // shrinks on short pages, otherwise a four-line page is all "edge".
    const counts = new Map<string, number>();
    for (const pageLines of lines) {
        const filled = pageLines.filter((line) => line.length > 0);
        const width = Math.max(1, Math.min(EDGE_LINES, Math.floor(filled.length / 4)));
        const edges = new Set([...filled.slice(0, width), ...filled.slice(-width)]);
        for (const line of edges) {
            if (line.length > MAX_LINE_CHARS) continue;
            const key = normalize(line);
            if (!key) continue;
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
    }

    const furniture = new Set(
        [...counts].filter(([, count]) => count >= MIN_PAGES).map(([key]) => key),
    );
    if (furniture.size === 0) return pages;

    return pages.map((page, index) => {
        const pageLines = lines[index];
        const filledIndexes = pageLines
            .map((line, position) => (line.length > 0 ? position : -1))
            .filter((position) => position >= 0);
        const width = Math.max(1, Math.min(EDGE_LINES, Math.floor(filledIndexes.length / 4)));
        const edges = new Set([
            ...filledIndexes.slice(0, width),
            ...filledIndexes.slice(-width),
        ]);

        const kept = pageLines.filter((line, position) => {
            // Keep paragraph breaks; they bound the summary windows.
            if (line.length === 0) return true;
            if (!edges.has(position)) return true;
            const key = normalize(line);
            // Empty after normalization means a bare page number.
            return key.length > 0 && !furniture.has(key);
        });

        return { page: page.page, text: kept.join('\n') };
    });
}
