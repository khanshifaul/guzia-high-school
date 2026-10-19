// src/ai/tests/grading.util.ts — auto-grading for online test papers.
//
// Rules (spec 10 Feature B, online delivery):
//   - MCQ: the student's chosen option letter must match the model answer
//     letter → full marks, else zero. Case/space-insensitive.
//   - SHORT / LONG: not auto-gradable — the teacher awards the score.
//
// The server does the comparing, never the LLM.

/** Normalises an option letter / free-text answer for comparison. */
function normalise(value: string): string {
    return value.trim().toLowerCase();
}

/**
 * Score one answer against its question.
 * Returns null when the question is not auto-gradable (teacher must score it).
 */
export function autoScore(
    type: 'MCQ' | 'SHORT' | 'LONG',
    modelAnswer: string,
    studentAnswer: string,
    marks: number,
): number | null {
    if (type !== 'MCQ') return null;
    return normalise(modelAnswer) === normalise(studentAnswer) ? marks : 0;
}

/**
 * Sum the auto-graded scores across answers. Answers the teacher graded
 * (autoGraded === false) keep their teacher score; unanswered questions
 * contribute nothing.
 */
export function totalScore(answers: { score: number | null }[]): number {
    return answers.reduce((sum, a) => sum + (a.score ?? 0), 0);
}
