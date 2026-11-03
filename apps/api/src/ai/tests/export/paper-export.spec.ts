// src/ai/tests/export/paper-export.spec.ts — the permanent export checks.
//
// These tests call the real renderers: Typst compiles a PDF and poppler reads
// it back, and the DOCX is unzipped. No network, no database.
import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseService } from '../../../database/database.service';
import { LlmService } from '../../llm/llm.service';
import { TestsService } from '../tests.service';
import { buildPaperModel, toBengaliDigits, type PaperSource } from './paper.model';
import { renderDocx } from './docx.renderer';
import { renderPdf } from './pdf.renderer';

function mcqFixture(): PaperSource {
    return {
        title: 'বার্ষিক পরীক্ষা ২০২৬',
        durationMinutes: 30,
        totalMarks: 30,
        className: 'নবম শ্রেণি',
        subjectName: 'গণিত',
        schoolName: 'Guzia Bilateral High School',
        schoolNameBn: 'গুজিয়া দ্বিপাক্ষিক উচ্চ বিদ্যালয়',
        questions: Array.from({ length: 30 }, (_, index) => ({
            type: 'MCQ',
            text:
                index === 0
                    ? 'নিচের উদ্দীপকটি পড়ে প্রশ্নের উত্তর দাও:\n১ + ১ = কত?'
                    : `প্রশ্ন নম্বর ${index + 1}: সঠিক উত্তরটি নির্বাচন করো।`,
            options: ['প্রথম', 'দ্বিতীয়', 'তৃতীয়', 'চতুর্থ'],
            marks: 1,
            order: index,
        })),
    };
}

/**
 * Five stimulus groups × three sub-parts (2 + 4 + 8 marks) = 70 marks, so the
 * creative sections come out as ক, খ, গ in ascending mark order.
 */
function creativeFixture(): PaperSource {
    const marks = [2, 4, 8];
    const questions = Array.from({ length: 15 }, (_, index) => {
        const group = Math.floor(index / 3);
        const part = index % 3;
        return {
            type: part === 0 ? 'SHORT' : 'LONG',
            text:
                part === 0
                    ? `উদ্দীপক ${group + 1}: নিচের উদ্দীপকটি পড়ে উত্তর দাও।`
                    : `প্রশ্ন ${group + 1}.${part + 1}: ব্যাখ্যা করো।`,
            marks: marks[part],
            order: index,
        };
    });

    return {
        title: 'সৃজনশীল পরীক্ষা ২০২৬',
        durationMinutes: 150,
        totalMarks: 70,
        className: 'দশম শ্রেণি',
        subjectName: 'বিজ্ঞান',
        schoolName: 'Guzia Bilateral High School',
        schoolNameBn: 'গুজিয়া দ্বিপাক্ষিক উচ্চ বিদ্যালয়',
        questions,
    };
}

function readPdf(buffer: Buffer): { pages: number; text: string } {
    const dir = mkdtempSync(join(tmpdir(), 'ghs-pdf-test-'));
    try {
        const file = join(dir, 'paper.pdf');
        writeFileSync(file, buffer);
        const info = execFileSync('pdfinfo', [file], { encoding: 'utf8' });
        const pages = /^Pages:\s+(\d+)/m.exec(info)?.[1];
        if (!pages) throw new Error(`pdfinfo did not report a page count:\n${info}`);
        const text = execFileSync('pdftotext', [file, '-'], { encoding: 'utf8' });
        return { pages: Number(pages), text };
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

function readDocxMember(buffer: Buffer, member: string): string {
    const dir = mkdtempSync(join(tmpdir(), 'ghs-docx-test-'));
    try {
        const file = join(dir, 'paper.docx');
        writeFileSync(file, buffer);
        return execFileSync('unzip', ['-p', file, member], {
            encoding: 'utf8',
            maxBuffer: 20 * 1024 * 1024,
        });
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

describe('paper export', () => {
    it(
        'renders a 30-item MCQ paper as a one- or two-page Bengali PDF',
        async () => {
            const pdf = await renderPdf(buildPaperModel(mcqFixture()));
            const { pages, text } = readPdf(pdf);

            expect(pages).toBeGreaterThanOrEqual(1);
            expect(pages).toBeLessThanOrEqual(2);
            expect(text).toContain('গুজিয়া দ্বিপাক্ষিক উচ্চ বিদ্যালয়');
            expect(text).toContain('সময় ৩০ মিনিট');
            expect(text).toContain('প্রশ্নপত্রে ৩০টি বহুনির্বাচনি প্রশ্ন রয়েছে');
            for (let number = 1; number <= 30; number += 1) {
                expect(text).toContain(`${toBengaliDigits(number)}.`);
            }
            expect(text).not.toMatch(/[‡†½¼¾ƒ]/);
        },
        20_000,
    );

    it(
        'renders the same MCQ paper as a two-column DOCX with 30 numbered items',
        async () => {
            const docx = await renderDocx(buildPaperModel(mcqFixture()));
            const xml = readDocxMember(docx, 'word/document.xml');
            const styles = readDocxMember(docx, 'word/styles.xml');
            const numbered = xml.match(/<w:t[^>]*>[০-৯]+\.<\/w:t>/g) ?? [];
            const defaults = /<w:docDefaults>[\s\S]*?<\/w:docDefaults>/.exec(styles)?.[0] ?? '';

            expect(numbered).toHaveLength(30);
            expect(xml).toMatch(/<w:cols[^>]*w:num="2"/);
            expect(xml).toContain('w:ascii="Times New Roman"');
            expect(xml).toContain('w:cs="Kalpurush"');
            expect(xml).toContain('w:eastAsia="Kalpurush"');
            expect(xml).toMatch(/<w:szCs\b/);
            expect(defaults).toContain('w:ascii="Times New Roman"');
            expect(defaults).toContain('w:cs="Kalpurush"');
            expect(defaults).toContain('w:eastAsia="Kalpurush"');
            expect(defaults).toMatch(/<w:szCs\b/);
            expect(readDocxMember(docx, '*.xml')).not.toMatch(/SutonnyMJ|Bijoy|Noto Sans Bengali/i);
        },
        20_000,
    );

    it(
        'renders the creative paper with ক, খ, গ section headings',
        async () => {
            const pdf = await renderPdf(buildPaperModel(creativeFixture()));
            const { text } = readPdf(pdf);

            expect(text).toContain('বিভাগ ক');
            expect(text).toContain('বিভাগ খ');
            expect(text).toContain('বিভাগ গ');
            expect(text).toContain('প্রশ্নপত্রে মোট ৭০ নম্বর');
            expect(text).not.toMatch(/[‡†½¼¾ƒ]/);
        },
        20_000,
    );

    it('throws ServiceUnavailable when TYPST_BIN does not exist', async () => {
        const previous = process.env.TYPST_BIN;
        process.env.TYPST_BIN = '/nonexistent/ghs-typst-does-not-exist';
        try {
            const model = buildPaperModel(mcqFixture());
            await expect(renderPdf(model)).rejects.toBeInstanceOf(ServiceUnavailableException);
            await expect(renderPdf(model)).rejects.toThrow('PDF renderer unavailable');
        } finally {
            if (previous === undefined) delete process.env.TYPST_BIN;
            else process.env.TYPST_BIN = previous;
        }
    });

    it('rejects a legacy-artifact paper with a 400 before rendering', () => {
        const source = mcqFixture();
        source.questions = source.questions.map((question, index) =>
            index === 2 ? { ...question, text: 'প্রশ্ন ‡' } : question,
        );

        try {
            buildPaperModel(source);
        } catch (error) {
            expect(error).toBeInstanceOf(BadRequestException);
            if (!(error instanceof BadRequestException)) throw error;
            expect(error.getStatus()).toBe(400);
            expect(error.message).toBe(
                'legacy Bijoy text is not supported; convert to Unicode first',
            );
            return;
        }
        throw new Error('expected the legacy-artifact guard to throw');
    });
});

function serviceForPaper(paperTeacherId: string): TestsService {
    const prisma = {
        teacher: { findUnique: async () => ({ id: 'teacher-self' }) },
        questionPaper: {
            findUnique: async () => ({
                id: 'paper-1',
                teacherId: paperTeacherId,
                title: 'বার্ষিক পরীক্ষা',
                durationMinutes: 30,
                totalMarks: 1,
                class: { name: 'নবম শ্রেণি' },
                subject: { name: 'গণিত' },
                questions: [
                    {
                        type: 'MCQ',
                        text: 'প্রশ্ন',
                        options: ['এক', 'দুই', 'তিন', 'চার'],
                        marks: 1,
                        order: 0,
                    },
                ],
            }),
        },
        siteSetting: { findUnique: async () => null },
    };

    return new TestsService(
        prisma as unknown as DatabaseService,
        undefined as unknown as LlmService,
    );
}

describe('paper export service contract', () => {
    it("returns 404 for another teacher's paper", async () => {
        await expect(
            serviceForPaper('teacher-other').exportPaper('paper-1', 'user-1', 'pdf'),
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    it(
        'defaults to a PDF and builds a Unicode Content-Disposition',
        async () => {
            const result = await serviceForPaper('teacher-self').exportPaper(
                'paper-1',
                'user-1',
                undefined,
            );

            expect(result.contentType).toBe('application/pdf');
            expect(result.buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
            expect(result.disposition).toMatch(/^attachment; filename="paper\.pdf"; filename\*=UTF-8''/);
            expect(result.filename).toBe('গণিত-নবম শ্রেণি-বার্ষিক পরীক্ষা.pdf');
        },
        20_000,
    );
});
