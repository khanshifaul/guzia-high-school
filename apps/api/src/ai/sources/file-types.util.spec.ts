// src/ai/sources/file-types.util.spec.ts — the coverage table and its 415 body.
import { HttpStatus } from '@nestjs/common';
import { detectFile, LEGACY_OFFICE, SUPPORTED, unsupportedFileError } from './file-types.util';

describe('detectFile', () => {
    it('accepts every supported extension and reports its extraction path', () => {
        const cases: [string, string][] = [
            ['notes.pdf', 'pdf'],
            ['notes.docx', 'office'],
            ['slides.pptx', 'office'],
            ['marks.xlsx', 'office'],
            ['marks.csv', 'text'],
            ['notes.txt', 'text'],
            ['notes.md', 'text'],
            ['page.html', 'html'],
            ['page.png', 'image'],
            ['page.jpeg', 'image'],
            ['page.jpg', 'image'],
            ['page.webp', 'image'],
        ];
        for (const [name, path] of cases) {
            expect(detectFile({ originalname: name, mimetype: 'application/octet-stream' })?.path).toBe(
                path as never,
            );
        }
    });

    it('accepts by MIME type when the extension is missing or generic', () => {
        expect(
            detectFile({ originalname: 'upload', mimetype: 'application/pdf' }),
        ).toEqual({ format: 'pdf', path: 'pdf', mime: 'application/pdf' });
        expect(
            detectFile({ originalname: 'upload', mimetype: 'text/csv' }),
        ).toEqual({ format: 'csv', path: 'text', mime: 'text/csv' });
        expect(
            detectFile({
                originalname: 'upload',
                mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            }),
        ).toEqual({
            format: 'docx',
            path: 'office',
            mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
        expect(
            detectFile({ originalname: 'upload', mimetype: 'image/png; charset=binary' }),
        ).toEqual({ format: 'png', path: 'image', mime: 'image/png' });
    });

    it('rejects unknown types and legacy Office files', () => {
        expect(detectFile({ originalname: 'archive.zip', mimetype: 'application/zip' })).toBeNull();
        expect(detectFile({ originalname: 'video.mp4', mimetype: 'video/mp4' })).toBeNull();
        for (const extension of ['.doc', '.ppt', '.xls']) {
            expect(detectFile({ originalname: `old${extension}`, mimetype: '' })).toBeNull();
        }
    });

    it('keeps Office formats on the office path, never a text-only path', () => {
        for (const format of ['docx', 'pptx', 'xlsx']) {
            const entry = SUPPORTED.find((candidate) => candidate.format === format);
            expect(entry?.path).toBe('office');
        }
    });
});

describe('unsupportedFileError', () => {
    it('is a 415 whose body lists every accepted format', () => {
        const error = unsupportedFileError('video.mp4');

        expect(error.getStatus()).toBe(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
        const body = error.getResponse() as {
            accepted: string[];
            extensions: string[];
            legacy: { extension: string; saveAs: string }[];
            message: string;
        };
        for (const entry of SUPPORTED) expect(body.accepted).toContain(entry.format);
        expect(body.accepted).toEqual(
            expect.arrayContaining(['pdf', 'docx', 'pptx', 'xlsx', 'csv', 'txt', 'md', 'html', 'png', 'jpeg', 'webp']),
        );
        expect(body.extensions).toEqual(expect.arrayContaining(['.pdf', '.docx', '.csv', '.html', '.webp']));
        expect(body.message).toContain('video.mp4');
        expect(body.message).toContain('.doc → .docx');
    });

    it('names every legacy format with what to save as', () => {
        const body = unsupportedFileError('old.doc').getResponse() as {
            legacy: { extension: string; saveAs: string }[];
        };
        expect(body.legacy).toEqual(LEGACY_OFFICE.map(({ extension, saveAs }) => ({ extension, saveAs })));
        expect(body.legacy).toEqual(
            expect.arrayContaining([
                { extension: '.doc', saveAs: '.docx' },
                { extension: '.ppt', saveAs: '.pptx' },
                { extension: '.xls', saveAs: '.xlsx' },
            ]),
        );
    });
});
