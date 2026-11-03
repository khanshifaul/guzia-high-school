// src/ai/tests/export/export-file.util.ts — format parsing, filename and
// Content-Disposition for the paper export route.
import { BadRequestException } from '@nestjs/common';

export type ExportFormat = 'pdf' | 'docx';

export const EXPORT_CONTENT_TYPES: Record<ExportFormat, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export function parseExportFormat(value: string | undefined): ExportFormat {
    if (value === undefined || value === '') return 'pdf';
    if (value === 'pdf' || value === 'docx') return value;
    throw new BadRequestException('format must be pdf or docx');
}

function cleanSegment(value: string): string {
    return Array.from(value)
        .map((character) => {
            // Path separators, quotes and control characters cannot appear in
            // a filename; the RFC 5987 form carries the rest faithfully.
            const forbidden = /[\\/:*?"<>|]/.test(character);
            return forbidden || character.charCodeAt(0) < 0x20 ? ' ' : character;
        })
        .join('')
        .replace(/\s+/g, ' ')
        .trim();
}

/** `<subject>-<class>-<title>.<ext>` in the source language. */
export function exportFilename(
    parts: { subjectName: string; className: string; title: string },
    format: ExportFormat,
): string {
    const base =
        [parts.subjectName, parts.className, parts.title]
            .map(cleanSegment)
            .filter((part) => part.length > 0)
            .join('-') || 'paper';
    return `${base}.${format}`;
}

/** RFC 5987 percent-encoding, including the characters encodeURIComponent leaves bare. */
function encodeRfc5987(value: string): string {
    return encodeURIComponent(value).replace(
        /['()*]/g,
        (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    );
}

/**
 * `attachment` with a filename both old and new clients understand: an ASCII
 * `filename` for the fallback and `filename*` for the exact Unicode name.
 */
export function contentDisposition(filename: string): string {
    const extension = filename.toLowerCase().endsWith('.docx') ? 'docx' : 'pdf';
    const ascii = filename
        .slice(0, filename.length - extension.length - 1)
        .replace(/[^\x20-\x7E]/g, '')
        .replace(/["\\]/g, '')
        .replace(/[^A-Za-z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[.-]+|[.-]+$/g, '');
    const fallback = `${ascii || 'paper'}.${extension}`;
    return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeRfc5987(filename)}`;
}
