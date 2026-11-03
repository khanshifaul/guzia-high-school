// src/ai/tests/export/paper.model.spec.ts — template selection, section
// grouping, numeral/time formatting, and the legacy-encoding guard.
import { BadRequestException } from '@nestjs/common';
import {
    LEGACY_TEXT_ERROR,
    buildPaperModel,
    formatDuration,
    formatTimeLine,
    toBengaliDigits,
    type PaperSource,
} from './paper.model';

function source(overrides: Partial<PaperSource> = {}): PaperSource {
    return {
        title: 'বার্ষিক পরীক্ষা',
        durationMinutes: 30,
        totalMarks: 2,
        className: 'নবম শ্রেণি',
        subjectName: 'গণিত',
        schoolName: 'Guzia Bilateral High School',
        schoolNameBn: 'গুজিয়া দ্বিপাক্ষিক উচ্চ বিদ্যালয়',
        questions: [
            {
                type: 'MCQ',
                text: 'প্রথম প্রশ্ন',
                options: ['এক', 'দুই', 'তিন', 'চার'],
                marks: 1,
                order: 0,
            },
            {
                type: 'MCQ',
                text: 'দ্বিতীয় প্রশ্ন',
                options: ['এক', 'দুই', 'তিন', 'চার'],
                marks: 1,
                order: 1,
            },
        ],
        ...overrides,
    };
}

function expectBadRequest(run: () => unknown): void {
    try {
        run();
    } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        if (!(error instanceof BadRequestException)) throw error;
        expect(error.getStatus()).toBe(400);
        expect(error.message).toBe(LEGACY_TEXT_ERROR);
        return;
    }
    throw new Error('expected a BadRequestException');
}

describe('paper export model', () => {
    it('converts ASCII digits to Bengali digits', () => {
        expect(toBengaliDigits(2026)).toBe('২০২৬');
        expect(toBengaliDigits('৩০ + 2')).toBe('৩০ + ২');
    });

    it('formats a duration the way the archive header does', () => {
        expect(formatDuration(30)).toBe('৩০ মিনিট');
        expect(formatDuration(150)).toBe('২ ঘণ্টা ৩০ মিনিট');
        expect(formatDuration(120)).toBe('২ ঘণ্টা');
        expect(formatDuration(45)).toBe('৪৫ মিনিট');
    });

    it('formats the time-and-marks line in Bengali', () => {
        expect(formatTimeLine(150, 70)).toBe('সময় ২ ঘণ্টা ৩০ মিনিট · পূর্ণমান ৭০');
    });

    it('uses the MCQ template only when every item is MCQ and marks equal the count', () => {
        const model = buildPaperModel(source());
        expect(model.template).toBe('mcq');
        expect(model.sections).toHaveLength(1);
        expect(model.sections[0].items.map((item) => item.number)).toEqual([1, 2]);
        expect(model.sections[0].items[0].options).toEqual(['এক', 'দুই', 'তিন', 'চার']);
        expect(model.header.timeLine).toBe('সময় ৩০ মিনিট · পূর্ণমান ২');
    });

    it('falls back to the creative template when totalMarks does not equal the item count', () => {
        const model = buildPaperModel(source({ totalMarks: 3 }));
        expect(model.template).toBe('creative');
    });

    it('falls back to the creative template when any question is not MCQ', () => {
        const model = buildPaperModel(
            source({
                questions: [
                    { type: 'MCQ', text: 'ক', options: ['এক'], marks: 1, order: 0 },
                    { type: 'SHORT', text: 'খ', marks: 1, order: 1 },
                ],
            }),
        );
        expect(model.template).toBe('creative');
    });

    it('groups creative sections by ascending marks and labels them ক/খ/গ', () => {
        const model = buildPaperModel(
            source({
                totalMarks: 14,
                questions: [
                    { type: 'LONG', text: 'গ', marks: 8, order: 0 },
                    { type: 'SHORT', text: 'ক', marks: 2, order: 1 },
                    { type: 'LONG', text: 'খ', marks: 4, order: 2 },
                ],
            }),
        );

        expect(model.template).toBe('creative');
        expect(model.sections.map((section) => section.label)).toEqual(['ক', 'খ', 'গ']);
        expect(model.sections.map((section) => section.marks)).toEqual([2, 4, 8]);
        expect(model.sections.map((section) => section.heading)).toEqual([
            '২ নম্বরের প্রশ্ন',
            '৪ নম্বরের প্রশ্ন',
            '৮ নম্বরের প্রশ্ন',
        ]);
        expect(model.sections.flatMap((section) => section.items.map((item) => item.number))).toEqual([
            1, 2, 3,
        ]);
        expect(model.sections[1].items[0].text).toBe('খ');
    });

    it('rejects legacy Bijoy artifacts in the title, question text, or an option', () => {
        expectBadRequest(() => buildPaperModel(source({ title: 'পরীক্ষা ‡' })));
        expectBadRequest(() =>
            buildPaperModel(
                source({
                    questions: [
                        { type: 'MCQ', text: 'প্রশ্ন ½', options: ['এক'], marks: 1, order: 0 },
                    ],
                }),
            ),
        );
        expectBadRequest(() =>
            buildPaperModel(
                source({
                    questions: [
                        { type: 'MCQ', text: 'প্রশ্ন', options: ['এক ƒ'], marks: 1, order: 0 },
                    ],
                }),
            ),
        );
    });
});
