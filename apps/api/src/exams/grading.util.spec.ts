// src/exams/grading.util.spec.ts — protects the canonical grading rules
// (specs/06 #1): band boundaries, pass mark, GPA/CGPA means, empty-input guards.
import { gradeSubject, examGPA, cgpa, bandFor, percent, type Band } from './grading.util';

const BANDS: Band[] = [
    { minPercent: 80, maxPercent: 100, letter: 'A+', point: 4.0 },
    { minPercent: 70, maxPercent: 79, letter: 'A', point: 3.5 },
    { minPercent: 60, maxPercent: 69, letter: 'A-', point: 3.0 },
    { minPercent: 50, maxPercent: 59, letter: 'B', point: 2.5 },
    { minPercent: 40, maxPercent: 49, letter: 'C', point: 2.0 },
    { minPercent: 33, maxPercent: 39, letter: 'D', point: 1.0 },
    { minPercent: 0, maxPercent: 32, letter: 'F', point: 0.0 },
];

describe('grading (canonical 4.0 scale)', () => {
    it('maps band boundaries exactly (79.99→A, 80→A+, 32→F, 33→D)', () => {
        expect(bandFor(79.99, BANDS).letter).toBe('A');
        expect(bandFor(80, BANDS).letter).toBe('A+');
        expect(bandFor(32, BANDS).letter).toBe('F');
        expect(bandFor(33, BANDS).letter).toBe('D');
    });

    it('grades a subject: percent, letter, point, and pass/fail at 33%', () => {
        const pass = gradeSubject({ marksObtained: 33, totalMarks: 100 }, BANDS);
        expect(pass).toMatchObject({ percent: 33, letter: 'D', point: 1.0, passed: true });

        const fail = gradeSubject({ marksObtained: 32, totalMarks: 100 }, BANDS);
        expect(fail.passed).toBe(false);

        const high = gradeSubject({ marksObtained: 79, totalMarks: 100 }, BANDS);
        expect(high).toMatchObject({ percent: 79, letter: 'A', point: 3.5 });
    });

    it('scales the pass mark by total (not hard-coded 33/100)', () => {
        // 50-mark paper: pass threshold = 16.5, so 17 passes, 16 fails.
        expect(gradeSubject({ marksObtained: 17, totalMarks: 50 }, BANDS).passed).toBe(true);
        expect(gradeSubject({ marksObtained: 16, totalMarks: 50 }, BANDS).passed).toBe(false);
    });

    it('computes exam GPA as the mean of subject points', () => {
        // A+ (4.0) + A (3.5) + B (2.5) → mean 3.33
        const gpa = examGPA(
            [
                { marksObtained: 85, totalMarks: 100 },
                { marksObtained: 72, totalMarks: 100 },
                { marksObtained: 55, totalMarks: 100 },
            ],
            BANDS,
        );
        expect(gpa).toBe(3.33);
    });

    it('computes CGPA as the mean of exam GPAs', () => {
        expect(cgpa([3.75, 3.67])).toBe(3.71);
    });

    it('returns 0 for empty inputs instead of NaN', () => {
        expect(examGPA([], BANDS)).toBe(0);
        expect(cgpa([])).toBe(0);
        expect(percent(10, 0)).toBe(0);
    });

    it('falls back to F/0 when the band table is empty (never throws)', () => {
        const graded = gradeSubject({ marksObtained: 90, totalMarks: 100 }, []);
        expect(graded).toMatchObject({ letter: 'F', point: 0 });
    });
});
