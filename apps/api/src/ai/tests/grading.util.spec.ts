// src/ai/tests/grading.util.spec.ts — protects the auto-grading rules for
// online test papers (spec 10 Feature B): MCQ auto-scores, written answers
// wait for the teacher.
import { autoScore, totalScore } from './grading.util';

describe('autoScore', () => {
    it('awards full marks when the chosen option matches the model answer', () => {
        expect(autoScore('MCQ', 'b', 'b', 1)).toBe(1);
    });

    it('awards zero when the chosen option differs', () => {
        expect(autoScore('MCQ', 'b', 'c', 1)).toBe(0);
    });

    it('ignores case and surrounding whitespace in the option letter', () => {
        expect(autoScore('MCQ', 'B', ' b ', 1)).toBe(1);
    });

    it('awards the full mark value of a multi-mark MCQ', () => {
        expect(autoScore('MCQ', 'a', 'a', 2)).toBe(2);
    });

    it('leaves written answers for the teacher to score', () => {
        expect(autoScore('SHORT', 'a model answer', 'a student answer', 2)).toBeNull();
        expect(autoScore('LONG', 'a model answer', 'a student answer', 5)).toBeNull();
    });
});

describe('totalScore', () => {
    it('sums the awarded scores', () => {
        expect(totalScore([{ score: 1 }, { score: 0 }, { score: 2 }])).toBe(3);
    });

    it('treats an ungraded answer as zero', () => {
        expect(totalScore([{ score: 2 }, { score: null }, { score: null }])).toBe(2);
    });

    it('is 0 for no answers', () => {
        expect(totalScore([])).toBe(0);
    });
});
