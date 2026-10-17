// src/exams/grading.util.ts — THE single canonical grading implementation
// (specs/04, specs/06). Every GPA/CGPA/letter on every screen comes from here.
// No other module recomputes grades. Pure functions → unit-testable.

// The four fields grading actually reads. Kept independent of the generated
// Prisma model so callers can pass plain objects (tests, computed bands).
export interface Band {
    minPercent: number;
    maxPercent: number;
    letter: string;
    point: number;
}

export interface SubjectMarkInput {
    marksObtained: number;
    totalMarks: number;
}

export interface GradedSubject extends SubjectMarkInput {
    percent: number;
    letter: string;
    point: number;
    passed: boolean;
}

/** Pass mark per subject = 33 marks out of 100 (BD convention), scaled by total. */
export const PASS_MARKS_PER_100 = 33;

export function percent(marksObtained: number, totalMarks: number): number {
    if (totalMarks <= 0) return 0;
    return (marksObtained / totalMarks) * 100;
}

/**
 * Find the band for a percentage. Bands are defined by integer `minPercent`
 * boundaries (A+ = 80, A = 70, …) but percentages are continuous, so a value
 * like 79.99 must still grade as A. We therefore pick the band with the
 * greatest minPercent that is <= pct — this covers the half-open ranges the
 * integer boundaries imply ([70, 80), [80, 100]) without gap-falling to F.
 */
export function bandFor(pct: number, bands: Band[]): Band {
    if (bands.length === 0) return { minPercent: 0, maxPercent: 100, letter: "F", point: 0 };

    let best: Band | null = null;
    for (const b of bands) {
        if (pct >= b.minPercent && (best === null || b.minPercent > best.minPercent)) {
            best = b;
        }
    }
    // Below every minPercent (e.g. a negative) → lowest band by point value.
    if (best === null) {
        return bands.reduce((lowest, b) => (b.point < lowest.point ? b : lowest), bands[0]);
    }
    return best;
}

/** Grade a single subject against the canonical bands. */
export function gradeSubject(mark: SubjectMarkInput, bands: Band[]): GradedSubject {
    const pct = percent(mark.marksObtained, mark.totalMarks);
    const band = bandFor(pct, bands);
    const passThreshold =
        (mark.totalMarks * PASS_MARKS_PER_100) / 100;
    return {
        ...mark,
        percent: round(pct, 2),
        letter: band.letter,
        point: band.point,
        passed: mark.marksObtained >= passThreshold,
    };
}

/** Exam GPA = mean of per-subject points, rounded to 2dp. */
export function examGPA(marks: SubjectMarkInput[], bands: Band[]): number {
    if (marks.length === 0) return 0;
    const points = marks.map((m) => gradeSubject(m, bands).point);
    const mean = points.reduce((sum, p) => sum + p, 0) / points.length;
    return round(mean, 2);
}

/** CGPA = mean of published exam GPAs, rounded to 2dp. */
export function cgpa(examGPAs: number[]): number {
    if (examGPAs.length === 0) return 0;
    const mean = examGPAs.reduce((sum, g) => sum + g, 0) / examGPAs.length;
    return round(mean, 2);
}

/** Banker-ish rounding to n decimals (avoid float artifacts like 3.5000000004). */
export function round(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
}
