// src/ai/tests/export/paper.model.ts — the one normalised shape both export
// renderers read.
//
// The archived papers use two layouts. A paper is the MCQ template only when
// every question is MCQ and the marks total equals the item count (25 or 30
// one-mark items); every other paper uses the creative layout, whose sections
// are the distinct question marks in ascending order, labelled ক/খ/গ.
//
// Nothing here parses stimulus groups or combination options out of a question
// — the schema has no field for that structure, so the text and options are
// carried through as stored.
import { BadRequestException } from '@nestjs/common';

export const LEGACY_TEXT_ERROR =
    'legacy Bijoy text is not supported; convert to Unicode first';

/** Bijoy/SutonnyMJ artifacts that mean the source was not converted to Unicode. */
const LEGACY_ARTIFACT_PATTERN = /[‡†½¼¾ƒ]/;

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'] as const;

/** Section labels in the order the archive uses them. */
export const SECTION_LABELS = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ', 'ছ', 'জ'] as const;

export type PaperTemplate = 'mcq' | 'creative';

/** The subset of a Prisma Question the export reads. */
export interface PaperSourceQuestion {
    type: string;
    text: string;
    /** Prisma Json: null, or the stored option strings. */
    options?: unknown;
    marks: number;
    order?: number;
    answer?: string | null;
}

/** The subset of a Prisma QuestionPaper the export reads. */
export interface PaperSource {
    title: string;
    durationMinutes: number;
    totalMarks: number;
    className: string;
    subjectName: string;
    schoolName?: string | null;
    schoolNameBn?: string | null;
    questions: readonly PaperSourceQuestion[];
}

export interface PaperItem {
    number: number;
    text: string;
    options: string[];
    marks: number;
}

export interface PaperSection {
    label: string;
    heading: string;
    marks: number;
    items: PaperItem[];
}

export interface PaperHeader {
    schoolName: string;
    examName: string;
    className: string;
    subjectName: string;
    /** e.g. "সময় ২ ঘণ্টা ৩০ মিনিট · পূর্ণমান ৭০" */
    timeLine: string;
    studentInfo: string;
    instruction: string;
}

export interface PaperModel {
    template: PaperTemplate;
    title: string;
    header: PaperHeader;
    sections: PaperSection[];
    totalMarks: number;
    durationMinutes: number;
    questionCount: number;
}

/** Converts every ASCII digit in the value to its Bengali counterpart. */
export function toBengaliDigits(value: string | number): string {
    return String(value).replace(/[0-9]/g, (digit) => BENGALI_DIGITS[Number(digit)]);
}

/**
 * Formats a duration the way the archive's header does: 30 → "৩০ মিনিট",
 * 150 → "২ ঘণ্টা ৩০ মিনিট", 120 → "২ ঘণ্টা".
 */
export function formatDuration(minutes: number): string {
    const total = Math.max(0, Math.round(minutes));
    const hours = Math.floor(total / 60);
    const rest = total % 60;
    if (hours === 0) return `${toBengaliDigits(rest)} মিনিট`;
    if (rest === 0) return `${toBengaliDigits(hours)} ঘণ্টা`;
    return `${toBengaliDigits(hours)} ঘণ্টা ${toBengaliDigits(rest)} মিনিট`;
}

/** "সময় ৩০ মিনিট · পূর্ণমান ৩০" */
export function formatTimeLine(durationMinutes: number, totalMarks: number): string {
    return `সময় ${formatDuration(durationMinutes)} · পূর্ণমান ${toBengaliDigits(totalMarks)}`;
}

function assertUnicode(value: string): void {
    if (LEGACY_ARTIFACT_PATTERN.test(value)) {
        throw new BadRequestException(LEGACY_TEXT_ERROR);
    }
}

function normaliseOptions(options: unknown): string[] {
    if (!Array.isArray(options)) return [];
    return options
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
}

function toItem(question: PaperSourceQuestion, number: number): PaperItem {
    return {
        number,
        text: question.text.trim(),
        options: question.type === 'MCQ' ? normaliseOptions(question.options) : [],
        marks: question.marks,
    };
}

function buildMcqSections(questions: readonly PaperSourceQuestion[]): PaperSection[] {
    return [
        {
            label: '',
            heading: 'বহুনির্বাচনি প্রশ্ন',
            marks: 1,
            items: questions.map((question, index) => toItem(question, index + 1)),
        },
    ];
}

function buildCreativeSections(questions: readonly PaperSourceQuestion[]): PaperSection[] {
    const byMarks = new Map<number, PaperSourceQuestion[]>();
    for (const question of questions) {
        const group = byMarks.get(question.marks) ?? [];
        group.push(question);
        byMarks.set(question.marks, group);
    }

    let number = 0;
    return [...byMarks.keys()]
        .sort((a, b) => a - b)
        .map((marks, index) => ({
            label: SECTION_LABELS[index] ?? '',
            heading: `${toBengaliDigits(marks)} নম্বরের প্রশ্ন`,
            marks,
            items: (byMarks.get(marks) ?? []).map((question) => {
                number += 1;
                return toItem(question, number);
            }),
        }));
}

/**
 * Normalises a paper into the template-agnostic model. Legacy-encoded text in
 * the title, a question, or an option is a 400: the renderers must never print
 * mojibake that looks like a question.
 */
export function buildPaperModel(source: PaperSource): PaperModel {
    const questions = [...source.questions].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );
    if (questions.length === 0) {
        throw new BadRequestException('paper has no questions');
    }

    assertUnicode(source.title);
    for (const question of questions) {
        assertUnicode(question.text);
        for (const option of normaliseOptions(question.options)) {
            assertUnicode(option);
        }
    }

    const isMcq =
        questions.every((question) => question.type === 'MCQ') &&
        source.totalMarks === questions.length;

    const schoolName =
        source.schoolNameBn?.trim() ||
        source.schoolName?.trim() ||
        'Guzia Bilateral High School';

    return {
        template: isMcq ? 'mcq' : 'creative',
        title: source.title.trim(),
        header: {
            schoolName,
            examName: source.title.trim(),
            className: source.className,
            subjectName: source.subjectName,
            timeLine: formatTimeLine(source.durationMinutes, source.totalMarks),
            studentInfo: 'নাম: …………………………………  রোল: …………………………',
            instruction: isMcq
                ? `প্রশ্নপত্রে ${toBengaliDigits(questions.length)}টি বহুনির্বাচনি প্রশ্ন রয়েছে। প্রতিটি প্রশ্নের মান ১।`
                : `প্রশ্নপত্রে মোট ${toBengaliDigits(source.totalMarks)} নম্বর। প্রতিটি বিভাগের নির্দেশনা অনুসরণ করে উত্তর দাও।`,
        },
        sections: isMcq
            ? buildMcqSections(questions)
            : buildCreativeSections(questions),
        totalMarks: source.totalMarks,
        durationMinutes: source.durationMinutes,
        questionCount: questions.length,
    };
}
