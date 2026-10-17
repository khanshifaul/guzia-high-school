// src/ai/tests/tests.service.ts — test-paper generation (spec 10 Feature B).
// The LLM returns question groups; the server assigns marks, enforces the
// total-marks sum, and normalizes to Question rows.
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { Prisma } from 'prisma/generated/client';
import { LlmService } from '../llm/llm.service';
import { z } from 'zod';

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

export interface GeneratePaperDto {
    classId: string;
    subjectId: string;
    topics: string[];
    mcq?: number;
    short?: number;
    long?: number;
    totalMarks: number;
    durationMinutes: number;
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

        const system =
            'You are a question-paper setter for a Bangladeshi high school. Generate a test paper ' +
            'as JSON: {"title": string, "groups": [{"type": "MCQ"|"SHORT"|"LONG", "questions": ' +
            '[{"text": string, "options": string[] (MCQ only, exactly 4), "answer": string, ' +
            '"explanation": string, "difficulty": "easy"|"medium"|"hard"}]}]}. ' +
            'Match the requested counts per type exactly. Questions must be answerable and ' +
            'curriculum-appropriate. Provide a model answer for every question.';
        const user =
            `Class: ${cls.name}\nSubject: ${subject.name}\nTopics: ${dto.topics.join(', ')}\n` +
            `MCQ: ${mcq}, Short: ${short}, Long: ${long}\nTotal marks: ${dto.totalMarks}, Duration: ${dto.durationMinutes} min`;

        const raw = await this.llm.complete({ system, user, json: true, maxTokens: 4000 });
        const paper = this.parsePaper(raw, { mcq, short, long });

        // Assign marks + enforce the total.
        let order = 0;
        const questions = paper.groups.flatMap((g) =>
            g.questions.map((q) => ({
                type: g.type,
                text: q.text,
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
            json = JSON.parse(raw);
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

    async findOne(id: string, teacherId: string) {
        const paper = await this.prisma.questionPaper.findUnique({
            where: { id },
            include: { questions: { orderBy: { order: 'asc' } }, class: true, subject: true },
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

    /** JWT carries the User id; the FK references the Teacher row. Resolve it. */
    private async resolveTeacherId(userId: string): Promise<string> {
        const teacher = await this.prisma.teacher.findUnique({ where: { userId } });
        if (!teacher) throw new NotFoundException('No teacher profile for this user');
        return teacher.id;
    }
}
