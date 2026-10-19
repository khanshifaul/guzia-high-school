// src/ai/sources/ocr.util.ts — OCR for scanned PDFs.
//
// A scan has no text layer: unpdf extracts nothing, so there is nothing to
// embed. poppler rasterizes the pages and tesseract reads them; the resulting
// page-tagged text then takes the normal chunk → embed → summarize path.
//
// Both binaries are optional system dependencies. When either is missing, OCR
// reports itself unavailable and the caller keeps the NEEDS_OCR status.
import { spawn } from 'node:child_process';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BadRequestException } from '@nestjs/common';

const RASTER_BIN = process.env.PDFTOPPM_BIN ?? 'pdftoppm';
const OCR_BIN = process.env.TESSERACT_BIN ?? 'tesseract';
const DPI = Number(process.env.OCR_DPI ?? 200);
/** Comma-separated tesseract languages; only `eng` is commonly installed. */
const LANGS = process.env.OCR_LANGS ?? 'eng';
const RASTER_TIMEOUT_MS = 300_000;
const PAGE_TIMEOUT_MS = 60_000;
/** tesseract is CPU-bound; a few workers keep a laptop responsive. */
const CONCURRENCY = 3;
const MAX_OUTPUT = 5 * 1024 * 1024;

let availability: Promise<boolean> | null = null;

function probe(bin: string, args: string[]): Promise<boolean> {
    const { promise, resolve } = Promise.withResolvers<boolean>();
    const child = spawn(bin, args, { stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
    return promise;
}

/** True when both poppler and tesseract are on PATH (probed once). */
export function ocrAvailable(): Promise<boolean> {
    availability ??= (async () => {
        // pdftoppm has no --version flag; -v prints the version and exits 0.
        const raster = await probe(RASTER_BIN, ['-v']);
        if (!raster) return false;
        return probe(OCR_BIN, ['--version']);
    })();
    return availability;
}

interface RunResult {
    code: number | null;
    stdout: string;
    stderr: string;
}

/** Spawn with an argument array (no shell), a timeout and an output cap. */
function run(bin: string, args: string[], timeoutMs: number): Promise<RunResult> {
    const { promise, resolve, reject } = Promise.withResolvers<RunResult>();
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
        if (stdout.length < MAX_OUTPUT) stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
        if (stderr.length < MAX_OUTPUT) stderr += chunk.toString('utf8');
    });
    child.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
    });
    child.on('close', (code) => {
        clearTimeout(timer);
        resolve({ code, stdout, stderr });
    });
    return promise;
}

/** pdftoppm numbers pages in the filename; read it back for the page tag. */
function pageNumber(file: string): number {
    const match = /(\d+)\.png$/i.exec(file);
    return match ? Number(match[1]) : 0;
}

/**
 * Rasterize every page and OCR it. Returns page-tagged text, empty pages
 * dropped. Throws BadRequestException with a usable message on failure.
 */
export async function ocrPdf(
    buffer: Buffer,
    filename: string,
): Promise<{ page: number; text: string }[]> {
    if (!(await ocrAvailable())) {
        throw new BadRequestException(
            'OCR is not available on this server (poppler and tesseract are required).',
        );
    }

    const dir = await mkdtemp(join(tmpdir(), 'ocr-'));
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_') || 'input.pdf';
    const pdfPath = join(dir, safe);

    try {
        await writeFile(pdfPath, buffer);

        const raster = await run(
            RASTER_BIN,
            ['-png', '-r', String(DPI), pdfPath, join(dir, 'page')],
            RASTER_TIMEOUT_MS,
        );
        if (raster.code !== 0) {
            throw new BadRequestException(
                `Could not rasterize this PDF (${raster.stderr.trim().slice(0, 200) || 'poppler failed'}).`,
            );
        }

        const images = (await readdir(dir))
            .filter((name) => /^page-.*\.png$/i.test(name))
            .sort((a, b) => pageNumber(a) - pageNumber(b));
        if (images.length === 0) {
            throw new BadRequestException('This PDF produced no pages to OCR.');
        }

        const pages: { page: number; text: string }[] = [];
        let cursor = 0;
        const worker = async () => {
            while (cursor < images.length) {
                const index = cursor;
                cursor += 1;
                const image = images[index];
                const result = await run(
                    OCR_BIN,
                    [join(dir, image), 'stdout', '-l', LANGS],
                    PAGE_TIMEOUT_MS,
                );
                const text = result.stdout.trim();
                if (text) pages.push({ page: pageNumber(image), text });
            }
        };
        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, images.length) }, worker));

        pages.sort((a, b) => a.page - b.page);
        if (pages.length === 0) {
            throw new BadRequestException('OCR found no text in this PDF.');
        }
        return pages;
    } finally {
        await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
}

/** The error a textless PDF raises, so the caller can mark it NEEDS_OCR. */
export class NeedsOcrError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NeedsOcrError';
    }
}
