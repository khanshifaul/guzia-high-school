// src/ai/tests/tests.service.spec.ts — protects the online-delivery rules
// (spec 10 Feature B): the window, one attempt per paper, auto-grading, and
// the teacher's score ceiling.
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { normaliseQuestionText, TestsService } from './tests.service';

const PAPER_ID = 'paper-1';
const STUDENT_ID = 'student-1';
const TEACHER_USER_ID = 'teacher-user-1';

interface AnswerRow {
    id: string;
    attemptId: string;
    questionId: string;
    answer: string;
    score: number | null;
    autoGraded: boolean | null;
}

interface PaperQuestion {
    id: string;
    type: string;
    answer: string;
    marks: number;
}

interface FakeState {
    paper: Record<string, unknown> | null;
    paperQuestions: PaperQuestion[];
    attempt: Record<string, unknown> | null;
    answers: AnswerRow[];
    studentClassId: string | null;
    paperTeacherId: string;
}

/** Minimal in-memory stand-in for the Prisma calls the attempt flow makes. */
function serviceWith(state: FakeState): TestsService {
    const prisma = {
        questionPaper: {
            findUnique: async () => {
                if (!state.paper) return null;
                return { ...state.paper, questions: state.paperQuestions };
            },
            findMany: async () => [],
        },
        question: {
            findUnique: async ({ where }: { where: { id: string } }) =>
                state.paperQuestions.find((q) => q.id === where.id) ?? null,
        },
        student: {
            findFirst: async ({ where }: { where: { id: string; classId: string } }) =>
                state.studentClassId === where.classId ? { id: where.id, classId: where.classId } : null,
        },
        testAttempt: {
            findUnique: async () =>
                state.attempt
                    ? {
                        ...state.attempt,
                        studentId: STUDENT_ID,
                        answers: state.answers,
                        paper: { ...(state.paper ?? {}), questions: state.paperQuestions },
                    }
                    : null,
            create: async ({ data }: { data: Record<string, unknown> }) => {
                state.attempt = { id: 'attempt-1', status: 'IN_PROGRESS', startedAt: new Date(), ...data };
                return state.attempt;
            },
            findMany: async () => [],
            update: async ({
                where,
                data,
            }: {
                where: { id: string };
                data: Record<string, unknown>;
            }) => {
                if (state.attempt) Object.assign(state.attempt, data);
                return { ...state.attempt, answers: state.answers };
            },
        },
        studentAnswer: {
            findUnique: async ({ where }: { where: { id: string } }) => {
                const found = state.answers.find((a) => a.id === where.id);
                if (!found) return null;
                return {
                    ...found,
                    attempt: {
                        id: 'attempt-1',
                        paper: { teacherId: state.paperTeacherId, questions: state.paperQuestions },
                        answers: state.answers,
                    },
                };
            },
            upsert: async ({
                where,
                create,
                update,
            }: {
                where: { attemptId_questionId: { attemptId: string; questionId: string } };
                create: Omit<AnswerRow, 'id'>;
                update: Partial<AnswerRow>;
            }) => {
                const existing = state.answers.find(
                    (a) =>
                        a.attemptId === where.attemptId_questionId.attemptId &&
                        a.questionId === where.attemptId_questionId.questionId,
                );
                if (existing) {
                    Object.assign(existing, update);
                    return existing;
                }
                const row: AnswerRow = { id: `answer-${state.answers.length + 1}`, ...create };
                state.answers.push(row);
                return row;
            },
            update: async ({
                where,
                data,
            }: {
                where: { id: string };
                data: Partial<AnswerRow>;
            }) => {
                const found = state.answers.find((a) => a.id === where.id);
                if (found) Object.assign(found, data);
                return found;
            },
        },
        teacher: {
            findUnique: async () => ({ id: state.paperTeacherId }),
        },
    };

    return new TestsService(prisma as never, {} as never);
}

function baseState(overrides: Partial<FakeState> = {}): FakeState {
    return {
        paper: {
            id: PAPER_ID,
            mode: 'ONLINE',
            classId: 'class-1',
            teacherId: 'teacher-1',
            startAt: new Date(Date.now() - 60_000),
            endAt: new Date(Date.now() + 60_000),
        },
        paperQuestions: [
            { id: 'q-mcq', type: 'MCQ', answer: 'b', marks: 1 },
            { id: 'q-short', type: 'SHORT', answer: 'model', marks: 2 },
        ],
        attempt: null,
        answers: [],
        studentClassId: 'class-1',
        paperTeacherId: 'teacher-1',
        ...overrides,
    };
}

describe('startAttempt', () => {
    it('refuses a paper that is not an online test', async () => {
        const state = baseState({
            paper: { id: PAPER_ID, mode: 'OFFLINE', classId: 'class-1', teacherId: 'teacher-1' },
        });
        const service = serviceWith(state);
        await expect(service.startAttempt(PAPER_ID, STUDENT_ID)).rejects.toThrow('Online test not found');
    });

    it("refuses a student who is not in the paper's class", async () => {
        const state = baseState({ studentClassId: 'other-class' });
        const service = serviceWith(state);
        await expect(service.startAttempt(PAPER_ID, STUDENT_ID)).rejects.toThrow(ForbiddenException);
    });

    it('refuses a test that has not opened yet', async () => {
        const state = baseState({
            paper: {
                id: PAPER_ID,
                mode: 'ONLINE',
                classId: 'class-1',
                teacherId: 'teacher-1',
                startAt: new Date(Date.now() + 60_000),
                endAt: new Date(Date.now() + 120_000),
            },
        });
        const service = serviceWith(state);
        await expect(service.startAttempt(PAPER_ID, STUDENT_ID)).rejects.toThrow('has not opened yet');
    });

    it('refuses a test that has already closed', async () => {
        const state = baseState({
            paper: {
                id: PAPER_ID,
                mode: 'ONLINE',
                classId: 'class-1',
                startAt: new Date(Date.now() - 120_000),
                endAt: new Date(Date.now() - 60_000),
            },
        });
        const service = serviceWith(state);
        await expect(service.startAttempt(PAPER_ID, STUDENT_ID)).rejects.toThrow('has closed');
    });

    it('refuses a second attempt once the first was submitted', async () => {
        const state = baseState({ attempt: { id: 'attempt-1', status: 'SUBMITTED' } });
        const service = serviceWith(state);
        await expect(service.startAttempt(PAPER_ID, STUDENT_ID)).rejects.toThrow(ConflictException);
    });
});

describe('saveAnswer', () => {
    it('auto-scores an MCQ answer and leaves written answers for the teacher', async () => {
        const state = baseState({ attempt: { id: 'attempt-1', status: 'IN_PROGRESS' } });
        const service = serviceWith(state);

        const mcq = await service.saveAnswer('attempt-1', STUDENT_ID, { questionId: 'q-mcq', answer: 'B' });
        expect(mcq.score).toBe(1);
        expect(mcq.autoGraded).toBe(true);

        const short = await service.saveAnswer('attempt-1', STUDENT_ID, { questionId: 'q-short', answer: 'mine' });
        expect(short.score).toBeNull();
        expect(short.autoGraded).toBe(false);
    });

    it('scores a wrong MCQ option as zero', async () => {
        const state = baseState({ attempt: { id: 'attempt-1', status: 'IN_PROGRESS' } });
        const service = serviceWith(state);
        const mcq = await service.saveAnswer('attempt-1', STUDENT_ID, { questionId: 'q-mcq', answer: 'a' });
        expect(mcq.score).toBe(0);
    });

    it('refuses an answer for a question outside the paper', async () => {
        const state = baseState({ attempt: { id: 'attempt-1', status: 'IN_PROGRESS' } });
        const service = serviceWith(state);
        await expect(
            service.saveAnswer('attempt-1', STUDENT_ID, { questionId: 'q-other', answer: 'x' }),
        ).rejects.toThrow(BadRequestException);
    });

    it('refuses to save after the attempt was submitted', async () => {
        const state = baseState({ attempt: { id: 'attempt-1', status: 'SUBMITTED' } });
        const service = serviceWith(state);
        await expect(
            service.saveAnswer('attempt-1', STUDENT_ID, { questionId: 'q-mcq', answer: 'b' }),
        ).rejects.toThrow(ConflictException);
    });
});

describe('gradeAnswer', () => {
    it("rejects a score above the question's maximum marks", async () => {
        const state = baseState({
            attempt: { id: 'attempt-1', status: 'SUBMITTED' },
            answers: [
                { id: 'answer-1', attemptId: 'attempt-1', questionId: 'q-short', answer: 'mine', score: null, autoGraded: false },
            ],
        });
        const service = serviceWith(state);
        await expect(service.gradeAnswer('answer-1', TEACHER_USER_ID, { score: 99 })).rejects.toThrow(
            "cannot exceed the question's maximum of 2 marks",
        );
    });

    it('keeps the attempt in SUBMITTED until every answer is scored', async () => {
        const state = baseState({
            attempt: { id: 'attempt-1', status: 'SUBMITTED' },
            answers: [
                { id: 'answer-1', attemptId: 'attempt-1', questionId: 'q-mcq', answer: 'b', score: 1, autoGraded: true },
                { id: 'answer-2', attemptId: 'attempt-1', questionId: 'q-short', answer: 'mine', score: null, autoGraded: false },
            ],
        });
        const service = serviceWith(state);
        await service.gradeAnswer('answer-2', TEACHER_USER_ID, { score: 2 });
        expect(state.attempt?.status).toBe('GRADED');
    });

    it('refuses to grade an auto-graded MCQ answer', async () => {
        const state = baseState({
            attempt: { id: 'attempt-1', status: 'SUBMITTED' },
            answers: [
                { id: 'answer-1', attemptId: 'attempt-1', questionId: 'q-mcq', answer: 'b', score: 1, autoGraded: true },
            ],
        });
        const service = serviceWith(state);
        await expect(service.gradeAnswer('answer-1', TEACHER_USER_ID, { score: 1 })).rejects.toThrow(
            'MCQ answers are auto-graded',
        );
    });
});

describe('normaliseQuestionText', () => {
    it('strips the model\'s own question number', () => {
        expect(normaliseQuestionText('1. Which is a folk song?')).toBe('Which is a folk song?');
        expect(normaliseQuestionText('2) Which is a folk song?')).toBe('Which is a folk song?');
    });

    it('strips a leading mark annotation', () => {
        expect(normaliseQuestionText('[2 marks] What is a Nakshi Kantha?')).toBe(
            'What is a Nakshi Kantha?',
        );
    });

    it('strips a trailing mark annotation', () => {
        expect(normaliseQuestionText('What is a Nakshi Kantha? [2 marks]')).toBe(
            'What is a Nakshi Kantha?',
        );
    });

    it('strips numbering and marks together', () => {
        expect(normaliseQuestionText('3. [4 marks] Compare folk songs and Nakshi Kantha.')).toBe(
            'Compare folk songs and Nakshi Kantha.',
        );
    });

    it('leaves a clean question untouched', () => {
        expect(normaliseQuestionText('What is a Nakshi Kantha?')).toBe('What is a Nakshi Kantha?');
    });

    it('keeps a number that is part of the question itself', () => {
        expect(normaliseQuestionText('Name the 3 types of folk song.')).toBe(
            'Name the 3 types of folk song.',
        );
    });
});
