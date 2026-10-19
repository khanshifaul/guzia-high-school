// src/ai/sources/text-clean.util.spec.ts — the scan cleavery rules.
import { stripRunningHeads } from './text-clean.util';

describe('stripRunningHeads', () => {
    it('drops a running head, the footer and bare page numbers', () => {
        const pages = [
            { page: 1, text: 'English For Today\nA paragraph about quilts.\n4' },
            { page: 2, text: 'English For Today\nAnother paragraph about food.\n5' },
            { page: 3, text: 'English For Today\nA third paragraph.\n6' },
            { page: 4, text: 'English For Today\nA fourth paragraph.\n7' },
        ];

        const out = stripRunningHeads(pages);

        expect(out.map((page) => page.text)).toEqual([
            'A paragraph about quilts.',
            'Another paragraph about food.',
            'A third paragraph.',
            'A fourth paragraph.',
        ]);
    });

    it('drops a unit-level head that repeats on a few pages of a long book', () => {
        const pages = Array.from({ length: 50 }, (_, index) => ({
            page: index + 1,
            text:
                index < 8
                    ? `Food and Nutrition ${index + 10}\nBody ${index}\n\nMore body ${index}`
                    : `Ceiling and Space ${index + 10}\nBody ${index}\n\nMore body ${index}`,
        }));

        const out = stripRunningHeads(pages);

        expect(out[0].text).not.toContain('Food and Nutrition');
        expect(out[0].text).toContain('Body 0');
        expect(out[20].text).not.toContain('Ceiling and Space');
        expect(out[20].text).toContain('Body 20');
    });

    it('leaves a short document alone', () => {
        const pages = [
            { page: 1, text: 'English For Today\nOne' },
            { page: 2, text: 'English For Today\nTwo' },
        ];
        expect(stripRunningHeads(pages)).toEqual(pages);
    });

    it('never touches body text in the middle of a page', () => {
        const pages = Array.from({ length: 4 }, (_, index) => ({
            page: index + 1,
            text: `English For Today\nline one\nEnglish For Today\nline three\nline four\nfooter ${['alpha', 'beta', 'gamma', 'delta'][index]}`,
        }));
        const out = stripRunningHeads(pages);
        // Only the top edge line goes; the inner repeat stays (it is body text).
        expect(out[0].text.split('\n')).toEqual([
            'line one',
            'English For Today',
            'line three',
            'line four',
            'footer alpha',
        ]);
    });

    it('keeps a unique heading that only appears once', () => {
        const pages = [
            { page: 1, text: 'Unique Chapter Heading\nBody one\n1' },
            { page: 2, text: 'English For Today\nBody two\n2' },
            { page: 3, text: 'English For Today\nBody three\n3' },
            { page: 4, text: 'English For Today\nBody four\n4' },
        ];
        const out = stripRunningHeads(pages);
        expect(out[0].text).toContain('Unique Chapter Heading');
    });

    it('keeps paragraph breaks so summary windows can split', () => {
        const pages = Array.from({ length: 4 }, (_, index) => ({
            page: index + 1,
            text: `English For Today\npara one\n\npara two\n${index + 1}`,
        }));
        expect(stripRunningHeads(pages)[0].text).toContain('\n\n');
    });
});
