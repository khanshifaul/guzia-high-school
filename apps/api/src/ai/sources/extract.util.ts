// src/ai/sources/extract.util.ts — one extraction pipeline for uploads.
//
// PDF → unpdf (page-tagged), image → the provider's vision model, Office/HTML →
// MarkItDown when installed then a native fallback (officeparser / htmlToText),
// plain text/CSV → UTF-8. Lives here, not in the service, so the bench measures
// the same code the upload path runs.
//
// Dependencies the service owns (the logger, the vision call) are injected:
// this module itself never reaches for a provider.
import { BadRequestException } from '@nestjs/common';
import { extractText } from 'unpdf';
import { parseOffice } from 'officeparser';
import { convertWithMarkItDown } from './markitdown.util';
import { NeedsOcrError } from './ocr.util';

export interface UploadFile {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
}

/** Which extraction path the uploaded file takes. */
export type ExtractPath = 'pdf' | 'image' | 'office' | 'html' | 'text';

export interface ExtractDeps {
    /** Transcribe one page image with the provider's vision model. */
    transcribeImage: (file: UploadFile) => Promise<string>;
    /** Injectable for tests/the bench; defaults to the real MarkItDown CLI. */
    convertDocument?: (buffer: Buffer, filename: string) => Promise<string | null>;
    logger?: { warn: (message: string) => void; error: (message: string) => void };
}

/** Extract page text from an uploaded file (throws when unreadable). */
export async function extractPages(
    file: UploadFile,
    path: ExtractPath,
    deps: ExtractDeps,
): Promise<{ page: number; text: string }[]> {
    const convert = deps.convertDocument ?? convertWithMarkItDown;

    if (path === 'pdf') {
        // pdf.js requires a Uint8Array; it rejects Node Buffers. This is a
        // zero-copy view over the same bytes.
        const bytes = new Uint8Array(file.buffer.buffer, file.buffer.byteOffset, file.buffer.byteLength);
        const doc = await extractText(bytes, { mergePages: false }).catch((err: Error) => {
            deps.logger?.error(`PDF extraction failed for ${file.originalname}: ${err.message}`);
            throw new BadRequestException(`Could not read this PDF (${err.message})`);
        });
        const raw = Array.isArray(doc.text) ? doc.text : [doc.text];
        const pages = raw.map((text, i) => ({ page: i + 1, text })).filter((p) => p.text.trim());
        if (pages.length === 0) {
            throw new NeedsOcrError(
                'This PDF is a scan (no text layer), so it cannot be searched yet. ' +
                    'Transcribe it with OCR to make it searchable.',
            );
        }
        return pages;
    }

    if (path === 'image') {
        const transcript = await deps.transcribeImage(file);
        if (!transcript.trim()) throw new BadRequestException('No text detected in this image.');
        return [{ page: 1, text: transcript }];
    }

    if (path === 'office' || path === 'html') {
        // Prefer MarkItDown when installed; fall back per format.
        const markdown = await convert(file.buffer, file.originalname).catch((err: Error) => {
            deps.logger?.warn(
                `MarkItDown failed for ${file.originalname}: ${err.message} — falling back`,
            );
            return null;
        });
        let text = markdown?.trim() ? markdown : '';

        if (!text && path === 'html') {
            text = htmlToText(file.buffer.toString('utf8'));
        }

        if (!text && path === 'office') {
            const ast = await parseOffice(file.buffer).catch((err: Error) => {
                deps.logger?.error(`Office parsing failed for ${file.originalname}: ${err.message}`);
                throw new BadRequestException(`Could not read this document (${err.message})`);
            });
            const out = await ast.to('text');
            text = String(out.value ?? '');
        }

        if (!text.trim()) throw new BadRequestException('No extractable text in this document.');
        return [{ page: 1, text }];
    }

    // Plain text, Markdown and CSV are already UTF-8 text.
    return [{ page: 1, text: file.buffer.toString('utf8') }];
}

/** Strip HTML to readable text (drops scripts/styles, tags and entities). */
export function htmlToText(html: string): string {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}
