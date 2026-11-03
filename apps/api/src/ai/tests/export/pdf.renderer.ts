// src/ai/tests/export/pdf.renderer.ts — Typst source → PDF buffer.
//
// Typst (0.15.1, static musl build) is the only renderer that lays out Bengali
// conjuncts and matras correctly without a browser. The binary is looked up at
// call time (`TYPST_BIN`, default `typst`), never at boot, so a machine without
// it still serves every other API route.
//
// Fonts are vendored under `assets/fonts` and passed to Typst with
// `--font-path`. Liberation Serif is metric-compatible with Times New Roman
// (which cannot be redistributed) and is listed first so Latin glyphs never
// come from a Bengali face; Bengali falls through to the bundled Noto Sans
// Bengali UI/regular cuts. Typst selects per glyph from the tuple, so the
// order is part of the contract.
//
// The DOCX names Kalpurush and embeds nothing; this PDF ships Noto instead
// because Noto is OFL and Kalpurush's licence is not relied on for bundling.
// That difference is deliberate.
import { InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { type PaperItem, type PaperModel, type PaperSection, toBengaliDigits } from './paper.model';

const COMPILE_TIMEOUT_MS = 20_000;
const FONT_FAMILIES = '("Liberation Serif", "Noto Sans Bengali UI", "Noto Sans Bengali")';

/** The vendored font directory, unless `EXPORT_FONT_PATH` names another. */
export function resolveFontDir(): string {
    const configured = process.env.EXPORT_FONT_PATH?.trim();
    if (configured) return resolve(configured);

    const candidates = [
        // `bun run dev` / tests run with apps/api as the cwd.
        resolve(process.cwd(), 'assets/fonts'),
        // `node apps/api/dist/src/main.js` from the repo root.
        resolve(process.cwd(), 'apps/api/assets/fonts'),
        // ts-jest: src/ai/tests/export → apps/api/assets/fonts.
        resolve(__dirname, '../../../../assets/fonts'),
        // nest build: dist/src/ai/tests/export → apps/api/assets/fonts.
        resolve(__dirname, '../../../../../assets/fonts'),
    ];
    return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

function escapeTypst(value: string): string {
    // Every one of these changes Typst markup if left bare. Escaping is
    // invisible in the output and keeps question text exactly as stored.
    return value.replace(/([\\#$[\]{}~_^*<>@`/+&=-])/g, '\\$1');
}

/** Stored text with its line breaks preserved. */
function inlineText(value: string): string {
    return value
        .split(/\r?\n/)
        .map(escapeTypst)
        .join(' #linebreak() ');
}

function optionLine(item: PaperItem): string {
    const labels = ['ক', 'খ', 'গ', 'ঘ'];
    return item.options
        .map((option, index) => {
            const label = labels[index] ?? `${index + 1}`;
            return `${escapeTypst(`${label})`)} ${escapeTypst(option)}`;
        })
        .join('  #h(0.8em)  ');
}

function headerLines(model: PaperModel): string[] {
    const { header } = model;
    return [
        '#align(center)[',
        `  #text(size: 15pt, weight: "bold")[${escapeTypst(header.schoolName)}]`,
        '  #linebreak()',
        `  #text(size: 12pt, weight: "bold")[${escapeTypst(header.examName)}]`,
        '  #linebreak()',
        `  ${escapeTypst(`${header.className} · ${header.subjectName}`)}`,
        '  #linebreak()',
        `  ${escapeTypst(header.timeLine)}`,
        '  #linebreak()',
        `  ${escapeTypst(header.studentInfo)}`,
        ']',
        '#line(length: 100%, stroke: 0.7pt)',
        `#align(center)[#text(size: 8.5pt, style: "italic")[${escapeTypst(header.instruction)}]]`,
    ];
}

function mcqBlock(item: PaperItem): string[] {
    const lines = [
        '  #block(spacing: 0.5em)[',
        `    #text(weight: "bold")[${toBengaliDigits(item.number)}.] ${inlineText(item.text)}`,
    ];
    if (item.options.length > 0) {
        lines.push('    #linebreak()');
        lines.push(`    #text(size: 9pt)[${optionLine(item)}]`);
    }
    lines.push('  ]');
    return lines;
}

function creativeBlock(item: PaperItem): string[] {
    return [
        '  #block(spacing: 0.55em)[',
        `    #text(weight: "bold")[${toBengaliDigits(item.number)}.] ${inlineText(item.text)}` +
            ` #text(size: 8.5pt)[(${toBengaliDigits(item.marks)})]`,
        ...(item.options.length > 0
            ? [
                  '    #linebreak()',
                  `    #text(size: 9pt)[${optionLine(item)}]`,
              ]
            : []),
        '  ]',
    ];
}

function sectionHeading(section: PaperSection): string {
    const label = section.label ? `বিভাগ ${section.label} — ` : '';
    return `#align(center)[#text(size: 11pt, weight: "bold")[${escapeTypst(`${label}${section.heading}`)}]]`;
}

/** Builds the Typst source from the same model the DOCX renderer reads. */
export function buildTypstSource(model: PaperModel): string {
    const lines: string[] = [
        '#set page(paper: "a4", margin: (x: 12mm, y: 12mm))',
        `#set text(font: ${FONT_FAMILIES}, size: 9.5pt)`,
        '#set par(leading: 0.55em)',
        '',
        ...headerLines(model),
        '',
    ];

    if (model.template === 'mcq') {
        lines.push('#columns(2)[');
        for (const section of model.sections) {
            for (const item of section.items) lines.push(...mcqBlock(item));
        }
        lines.push(']');
    } else {
        for (const section of model.sections) {
            lines.push(sectionHeading(section));
            for (const item of section.items) lines.push(...creativeBlock(item));
        }
    }

    lines.push('');
    return lines.join('\n');
}

function runTypst(args: readonly string[]): Promise<void> {
    const binary = process.env.TYPST_BIN?.trim() || 'typst';
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    execFile(
        binary,
        [...args],
        { timeout: COMPILE_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 },
        (error, _stdout, stderr) => {
            if (!error) {
                resolve();
                return;
            }
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                reject(new ServiceUnavailableException('PDF renderer unavailable'));
                return;
            }
            const detail = stderr.trim() || error.message;
            reject(new InternalServerErrorException(`PDF rendering failed: ${detail}`));
        },
    );
    return promise;
}

/** Compiles a PDF in a throwaway directory and always removes it. */
export async function renderPdf(model: PaperModel): Promise<Buffer> {
    const workDir = await mkdtemp(join(tmpdir(), 'ghs-paper-export-'));
    try {
        const input = join(workDir, 'paper.typ');
        const output = join(workDir, 'paper.pdf');
        await writeFile(input, buildTypstSource(model), 'utf8');
        await runTypst([
            'compile',
            '--font-path',
            resolveFontDir(),
            '--root',
            workDir,
            input,
            output,
        ]);
        return await readFile(output);
    } finally {
        await rm(workDir, { recursive: true, force: true });
    }
}
