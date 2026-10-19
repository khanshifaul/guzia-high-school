// src/ai/sources/markitdown.util.ts — optional MarkItDown integration.
// Microsoft's MarkItDown (Python) converts Office/EPUB/HTML/PDF to Markdown.
// It is NOT a hard dependency: when the CLI is absent, callers fall back to
// the native parsers. The process is spawned with an argument array (no shell)
// against a temp file, with a timeout and an output cap.
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BIN = process.env.MARKITDOWN_BIN ?? 'markitdown';
const TIMEOUT_MS = 30_000;
const MAX_OUTPUT = 5 * 1024 * 1024;

let available: Promise<boolean> | null = null;

function probe(): Promise<boolean> {
    const { promise, resolve } = Promise.withResolvers<boolean>();
    const child = spawn(BIN, ['--version'], { stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('exit', (code) => resolve(code === 0));
    return promise;
}

/** True when the markitdown CLI is on PATH (probed once). */
export function markitdownAvailable(): Promise<boolean> {
    available ??= probe();
    return available;
}

/** Convert a document to Markdown. Resolves null when MarkItDown is unavailable. */
export async function convertWithMarkItDown(
    buffer: Buffer,
    filename: string,
): Promise<string | null> {
    if (!(await markitdownAvailable())) return null;

    const dir = await mkdtemp(join(tmpdir(), 'markitdown-'));
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_') || 'input';
    const path = join(dir, safe);
    try {
        await writeFile(path, buffer);
        const { promise, resolve, reject } = Promise.withResolvers<string>();
        const child = spawn(BIN, [path], { stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '';
        let err = '';
        const timer = setTimeout(() => child.kill('SIGKILL'), TIMEOUT_MS);
        child.stdout.on('data', (chunk: Buffer) => {
            if (out.length < MAX_OUTPUT) out += chunk.toString('utf8');
        });
        child.stderr.on('data', (chunk: Buffer) => {
            if (err.length < 8_000) err += chunk.toString('utf8');
        });
        child.on('error', (e) => {
            clearTimeout(timer);
            reject(e);
        });
        child.on('close', (code) => {
            clearTimeout(timer);
            if (code !== 0) {
                reject(new Error(err.trim() || `markitdown exited with ${code}`));
                return;
            }
            resolve(out);
        });
        return await promise;
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
}
