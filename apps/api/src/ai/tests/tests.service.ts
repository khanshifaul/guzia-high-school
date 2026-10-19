// src/ai/tests/tests.service.ts — test-paper generation (spec 10 Feature B).
// The LLM returns question groups; the server assigns marks, enforces the
// total-marks sum, and normalizes to Question rows.
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { Prisma, TestMode } from 'prisma/generated/client';
import { LlmService } from '../llm/llm.service';
import { z } from 'zod';
import { parseJsonObject } from '../llm/json.util';
import { autoScore, totalScore } from './grading.util';
import { GradeAnswerDto, SaveAnswerDto } from './dto';

/**
 * The question fields a student may see. `answer` and `explanation` are the
 * answer key and must never travel to a student — the student page renders
 * the question, its options and its marks, nothing else.
 */
const STUDENT_QUESTION_SELECT = {
    id: true,
    type: true,
    text: true,
    options: true,
    marks: true,
    order: true,
} as const;

const PaperSchema = z.object({
    title: z.string(),
    groups: z
        .array(
            z.object({
                type: z.enum(['MCQ', 'SHORT', 'LONG']),
                questions: z
                    .array(
                        z.object({
                            text: z.string(),
                            options: z.array(z.string()).optional(),
                            answer: z.string(),
                            explanation: z.string().optional(),
                            difficulty: z.string(),
                        }),
                    )
                    .min(1),
            }),
        )
        .min(1),
});

/** Per-question marks by type (blueprint math lives here, not in the LLM). */
const MARKS_BY_TYPE: Record<'MCQ' | 'SHORT' | 'LONG', number> = {
    MCQ: 1,
    SHORT: 2,
    LONG: 5,
};

/**
 * Strips the numbering and mark annotations the LLM sometimes bakes into a
 * question's text ("1. [2 marks] What is…"). The server owns the numbering
 * and the marks — they are rendered from `order` and `marks` — so a second
 * copy from the model would print as "1. 1. [2 marks] …".
 */
export function normaliseQuestionText(text: string): string {
    return text
        .replace(/^\s*\d+\s*[.)]\s*/, '') // leading "1." / "2)" numbering
        .replace(/^\s*\[\s*\d+\s*marks?\s*\]\s*/i, '') // leading "[2 marks]"
        .replace(/\s*\[\s*\d+\s*marks?\s*\]\s*$/i, '') // trailing "[2 marks]"
        .trim();
}

export interface GeneratePaperDto {
    classId: string;
    subjectId: string;
    topics: string[];
    mcq?: number;
    short?: number;
    long?: number;
    totalMarks: number;
    durationMinutes: number;
    mode?: TestMode;
    startAt?: string;
    endAt?: string;
}

@Injectable()
export class TestsService {
    constructor(
        private readonly prisma: DatabaseService,
        private readonly llm: LlmService,
    ) {}

    async list(userId: string) {
        const teacherId = await this.resolveTeacherId(userId);
        return this.prisma.questionPaper.findMany({
            where: { teacherId },
            include: { class: true, subject: true, _count: { select: { questions: true } } },
            orderBy: { updatedAt: 'desc' },
        });
    }

    async generate(dto: GeneratePaperDto, userId: string) {
        const teacherId = await this.resolveTeacherId(userId);
        const cls = await this.prisma.class.findUnique({ where: { id: dto.classId } });
        if (!cls) throw new NotFoundException('Class not found');
        const subject = await this.prisma.subject.findUnique({ where: { id: dto.subjectId } });
        if (!subject) throw new NotFoundException('Subject not found');

        const mcq = dto.mcq ?? 10;
        const short = dto.short ?? 5;
        const long = dto.long ?? 3;

        const mode = dto.mode ?? 'OFFLINE';
        if (mode === 'ONLINE') {
            if (!dto.startAt || !dto.endAt) {
                throw new BadRequestException('Online tests require startAt and endAt');
            }
            if (new Date(dto.startAt) >= new Date(dto.endAt)) {
                throw new BadRequestException('startAt must be before endAt');
            }
        }

        const system =
            'You are a question-paper setter for a Bangladeshi high school. Generate a test paper ' +
            'as JSON: {"title": string, "groups": [{"type": "MCQ"|"SHORT"|"LONG", "questions": ' +
            '[{"text": string, "options": string[] (MCQ only, exactly 4), "answer": string, ' +
            '"explanation": string, "difficulty": "easy"|"medium"|"hard"}]}]}. ' +
            'Match the requested counts per type exactly. Questions must be answerable and ' +
            'curriculum-appropriate. Provide a model answer for every question. ' +
            'Write only the question itself in "text" — no question number, no "[N marks]" ' +
            'annotation, and no answer; the server adds numbering and marks.';
        const user =
            `Class: ${cls.name}\nSubject: ${subject.name}\nTopics: ${dto.topics.join(', ')}\n` +
            `MCQ: ${mcq}, Short: ${short}, Long: ${long}\nTotal marks: ${dto.totalMarks}, Duration: ${dto.durationMinutes} min`;

        const raw = await this.llm.complete({
            system,
            user,
            json: true,
            maxTokens: 4000,
            mockFixture: 'paper',
            mockCounts: { mcq, short, long },
        });
        const paper = this.parsePaper(raw, { mcq, short, long });

        // Assign marks + enforce the total.
        let order = 0;
        const questions = paper.groups.flatMap((g) =>
            g.questions.map((q) => ({
                type: g.type,
                text: normaliseQuestionText(q.text),
                // Prisma JSON fields reject bare null; use JsonNull sentinel.
                options: g.type === 'MCQ' ? ((q.options ?? []).slice(0, 4) as Prisma.InputJsonValue) : Prisma.JsonNull,
                answer: q.answer,
                explanation: q.explanation ?? null,
                difficulty: q.difficulty,
                marks: MARKS_BY_TYPE[g.type],
                order: order++,
            })),
        );
        const computedTotal = questions.reduce((s, q) => s + q.marks, 0);
        if (computedTotal !== dto.totalMarks) {
            throw new BadRequestException(
                `Blueprint total (${dto.totalMarks}) does not match generated marks sum (${computedTotal}). ` +
                    `Adjust counts or totalMarks.`,
            );
        }

        return this.prisma.questionPaper.create({
            data: {
                teacherId,
                classId: dto.classId,
                subjectId: dto.subjectId,
                title: paper.title,
                durationMinutes: dto.durationMinutes,
                totalMarks: dto.totalMarks,
                mode,
                startAt: dto.startAt ?? null,
                endAt: dto.endAt ?? null,
                status: 'DRAFT',
                questions: { create: questions },
            },
            include: { questions: { orderBy: { order: 'asc' } } },
        });
    }

    private parsePaper(
        raw: string,
        counts: { mcq: number; short: number; long: number },
    ) {
        let json: unknown;
        try {
            json = parseJsonObject(raw);
        } catch {
            throw new BadRequestException('AI returned invalid JSON; try again');
        }
        const result = PaperSchema.safeParse(json);
        if (!result.success) {
            throw new BadRequestException('AI paper JSON did not match the expected shape');
        }
        const byType = (t: string) =>
            result.data.groups.find((g) => g.type === t)?.questions.length ?? 0;
        if (
            byType('MCQ') !== counts.mcq ||
            byType('SHORT') !== counts.short ||
            byType('LONG') !== counts.long
        ) {
            throw new BadRequestException(
                `AI returned counts MCQ=${byType('MCQ')}, SHORT=${byType('SHORT')}, LONG=${byType('LONG')}; ` +
                    `expected ${counts.mcq}/${counts.short}/${counts.long}. Try again.`,
            );
        }
        return result.data;
    }


    async findOne(id: string, userId: string) {
        const teacherId = await this.resolveTeacherId(userId);
        const paper = await this.prisma.questionPaper.findUnique({
            where: { id },
            include: {
                questions: { orderBy: { order: 'asc' } },
                class: true,
                subject: true,
                teacher: { include: { user: { select: { fullName: true } } } },
            },
        });
        if (!paper || paper.teacherId !== teacherId) throw new NotFoundException('Paper not found');
        return paper;
    }

    async remove(id: string, userId: string) {
        const teacherId = await this.resolveTeacherId(userId);
        const paper = await this.prisma.questionPaper.findUnique({ where: { id } });
        if (!paper || paper.teacherId !== teacherId) throw new NotFoundException('Paper not found');
        await this.prisma.questionPaper.delete({ where: { id } });
        return { deleted: true };
    }

    // ---------------------------------------------------------------------
    // Online delivery: attempts, answers, grading (spec 10 Feature B).
    // ---------------------------------------------------------------------

    /** Online papers a student can attempt right now (open window, not yet submitted). */
    async availableForStudent(studentId: string) {
        const now = new Date();
        return this.prisma.questionPaper.findMany({
            where: {
                mode: 'ONLINE',
                class: { students: { some: { id: studentId } } },
                AND: [
                    { OR: [{ startAt: null }, { startAt: { lte: now } }] },
                    { OR: [{ endAt: null }, { endAt: { gte: now } }] },
                ],
            },
            include: {
                class: true,
                subject: true,
                questions: { select: STUDENT_QUESTION_SELECT, orderBy: { order: 'asc' } },
                attempts: { where: { studentId } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /** Start (or resume) a student's attempt at an online paper. */
    async startAttempt(paperId: string, studentId: string) {
        const paper = await this.prisma.questionPaper.findUnique({
            where: { id: paperId },
            include: { questions: { select: STUDENT_QUESTION_SELECT, orderBy: { order: 'asc' } } },
        });
        if (!paper || paper.mode !== 'ONLINE') throw new NotFoundException('Online test not found');

        const enrolled = await this.prisma.student.findFirst({
            where: { id: studentId, classId: paper.classId },
        });
        if (!enrolled) throw new ForbiddenException('You are not enrolled in this class');

        const now = new Date();
        if (paper.startAt && paper.startAt > now) {
            throw new BadRequestException('This test has not opened yet');
        }
        if (paper.endAt && paper.endAt < now) {
            throw new BadRequestException('This test has closed');
        }

        const existing = await this.prisma.testAttempt.findUnique({
            where: { paperId_studentId: { paperId, studentId } },
            include: { answers: true },
        });
        if (existing) {
            if (existing.status !== 'IN_PROGRESS') {
                throw new ConflictException('You have already submitted this test');
            }
            return this.attemptWithPaper(existing.id);
        }

        const attempt = await this.prisma.testAttempt.create({
            data: { paperId, studentId },
        });
        return this.attemptWithPaper(attempt.id);
    }

    /** Save (or overwrite) one answer on the student's in-progress attempt. */
    async saveAnswer(attemptId: string, studentId: string, dto: SaveAnswerDto) {
        const attempt = await this.prisma.testAttempt.findUnique({
            where: { id: attemptId },
            include: { paper: { include: { questions: true } } },
        });
        if (!attempt || attempt.studentId !== studentId) throw new NotFoundException('Attempt not found');
        if (attempt.status !== 'IN_PROGRESS') {
            throw new ConflictException('This attempt is no longer in progress');
        }

        const question = attempt.paper.questions.find((q) => q.id === dto.questionId);
        if (!question) throw new BadRequestException('Question does not belong to this test');

        const autoGraded = question.type === 'MCQ';
        const score = autoGraded
            ? autoScore('MCQ', question.answer, dto.answer, question.marks)
            : null;

        return this.prisma.studentAnswer.upsert({
            where: { attemptId_questionId: { attemptId, questionId: dto.questionId } },
            create: {
                attemptId,
                questionId: dto.questionId,
                answer: dto.answer,
                score,
                autoGraded,
            },
            update: {
                answer: dto.answer,
                ...(autoGraded ? { score, autoGraded: true } : { score: null, autoGraded: false }),
            },
        });
    }

    /** Submit the attempt: lock the answers and sum the auto-graded scores. */
    async submitAttempt(attemptId: string, studentId: string) {
        const attempt = await this.prisma.testAttempt.findUnique({
            where: { id: attemptId },
            include: { answers: true },
        });
        if (!attempt || attempt.studentId !== studentId) throw new NotFoundException('Attempt not found');
        if (attempt.status !== 'IN_PROGRESS') {
            throw new ConflictException('This attempt has already been submitted');
        }

        return this.prisma.testAttempt.update({
            where: { id: attemptId },
            data: {
                status: 'SUBMITTED',
                submittedAt: new Date(),
                totalScore: totalScore(attempt.answers),
            },
            include: { answers: true },
        });
    }

    /** All attempts on a paper (teacher's grading view). */
    async listAttempts(paperId: string, userId: string) {
        const teacherId = await this.resolveTeacherId(userId);
        const paper = await this.prisma.questionPaper.findUnique({ where: { id: paperId } });
        if (!paper || paper.teacherId !== teacherId) throw new NotFoundException('Paper not found');

        return this.prisma.testAttempt.findMany({
            where: { paperId },
            include: {
                student: { select: { id: true, fullName: true, rollNo: true } },
                answers: { include: { question: true } },
            },
            orderBy: { startedAt: 'asc' },
        });
    }

    /** Teacher awards a score for a written answer (MCQ answers are auto-graded). */
    async gradeAnswer(answerId: string, userId: string, dto: GradeAnswerDto) {
        const teacherId = await this.resolveTeacherId(userId);
        const answer = await this.prisma.studentAnswer.findUnique({
            where: { id: answerId },
            include: { attempt: { include: { paper: true } } },
        });
        if (!answer) throw new NotFoundException('Answer not found');
        if (answer.attempt.paper.teacherId !== teacherId) {
            throw new ForbiddenException('You can only grade your own papers');
        }
        if (answer.autoGraded) {
            throw new BadRequestException('MCQ answers are auto-graded');
        }
        const question = await this.prisma.question.findUnique({
            where: { id: answer.questionId },
        });
        if (!question) throw new NotFoundException('Question not found');
        if (dto.score > question.marks) {
            throw new BadRequestException(
                `Score cannot exceed the question's maximum of ${question.marks} marks`,
            );
        }

        const updated = await this.prisma.studentAnswer.update({
            where: { id: answerId },
            data: { score: dto.score },
        });
        const attempt = await this.prisma.testAttempt.findUnique({
            where: { id: answer.attemptId },
            include: { answers: true },
        });
        const answers = attempt?.answers ?? [];
        const fullyGraded = answers.every((a) => a.score !== null);
        await this.prisma.testAttempt.update({
            where: { id: answer.attemptId },
            data: {
                status: fullyGraded ? 'GRADED' : 'SUBMITTED',
                totalScore: totalScore(answers),
            },
        });
        return updated;
    }

    /** The attempt plus its paper's questions (what the student sees while taking it). */
    private async attemptWithPaper(attemptId: string) {
        return this.prisma.testAttempt.findUnique({
            where: { id: attemptId },
            include: {
                answers: true,
                paper: {
                    include: {
                        class: true,
                        subject: true,
                        questions: { select: STUDENT_QUESTION_SELECT, orderBy: { order: 'asc' } },
                    },
                },
            },
        });
    }

    /** JWT carries the User id; the FK references the Teacher row. Resolve it. */
    private async resolveTeacherId(userId: string): Promise<string> {
        const teacher = await this.prisma.teacher.findUnique({ where: { userId } });
        if (!teacher) throw new NotFoundException('No teacher profile for this user');
        return teacher.id;
    }
}
