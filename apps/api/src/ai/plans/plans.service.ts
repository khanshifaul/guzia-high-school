// src/ai/plans/plans.service.ts — year/term plan generation (spec 10 Feature A).
// The LLM returns topics/objectives only; the server fills week dates from
// startDate (skips Fridays — BD weekend) and validates week count.
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { Prisma } from 'prisma/generated/client';
import { LlmService } from '../llm/llm.service';
import { z } from 'zod';

// Concrete week shape so Prisma accepts it as InputJsonValue (a bare
// Record<string, unknown> lacks the index signature Prisma requires).
export interface PlanWeek {
    week: number;
    startAt: string;
    topics: string[];
    objective: string;
    assessment: string | null;
    status: 'PLANNED' | 'DONE';
}

const PlanWeeksSchema = z.object({
    title: z.string(),
    weeks: z
        .array(
            z.object({
                topics: z.array(z.string()).min(1),
                objective: z.string(),
                assessment: z.string().nullable().optional(),
            }),
        )
        .min(1),
});

export interface GeneratePlanDto {
    classId: string;
    subjectId: string;
    type: 'YEAR' | 'TERM';
    startDate: string; // YYYY-MM-DD
    weeks?: number;    // default: TERM→12, YEAR→16
    topicsHint?: string;
}

@Injectable()
export class PlansService {
    constructor(
        private readonly prisma: DatabaseService,
        private readonly llm: LlmService,
    ) {}

    async list(userId: string) {
        const teacherId = await this.resolveTeacherId(userId);
        return this.prisma.teachingPlan.findMany({
            where: { teacherId },
            include: { class: true, subject: true },
            orderBy: { updatedAt: 'desc' },
        });
    }

    async generate(dto: GeneratePlanDto, userId: string) {
        const teacherId = await this.resolveTeacherId(userId);
        const cls = await this.prisma.class.findUnique({ where: { id: dto.classId } });
        if (!cls) throw new NotFoundException('Class not found');
        const subject = await this.prisma.subject.findUnique({ where: { id: dto.subjectId } });
        if (!subject) throw new NotFoundException('Subject not found');

        const weekCount = dto.weeks ?? (dto.type === 'TERM' ? 12 : 16);
        if (weekCount < 1 || weekCount > 52) {
            throw new BadRequestException('weeks must be between 1 and 52');
        }

        const system =
            'You are a curriculum planner for a Bangladeshi high school (grades 6-10). ' +
            'Given a class, subject, and number of weeks, produce a realistic year/term teaching plan. ' +
            'Respond ONLY with a JSON object: {"title": string, "weeks": [{"topics": string[], ' +
            '"objective": string, "assessment": string|null}]}. ' +
            'The weeks array MUST have exactly the requested count. Each week needs 1-3 concrete topics ' +
            '(aligned to NCTB-style chapter sequencing), one learning objective, and an optional ' +
            'assessment (quiz/assignment) every few weeks. Do NOT invent dates — topics only.';
        const user = `Class: ${cls.name}\nSubject: ${subject.name}\nType: ${dto.type}\nWeeks: ${weekCount}` +
            (dto.topicsHint ? `\nFocus topics: ${dto.topicsHint}` : '');

        const raw = await this.llm.complete({ system, user, json: true, maxTokens: 2000, mockFixture: 'plan' });
        const parsed = this.parsePlan(raw, weekCount);

        const weeks = this.fillDates(parsed.weeks, dto.startDate);

        return this.prisma.teachingPlan.create({
            data: {
                teacherId,
                classId: dto.classId,
                subjectId: dto.subjectId,
                type: dto.type,
                title: parsed.title,
                startDate: new Date(dto.startDate),
                weeks: weeks as unknown as Prisma.InputJsonValue,
                status: 'DRAFT',
            },
        });
    }

    /** Parse + validate the LLM JSON; one retry is handled by the LLM layer. */
    private parsePlan(raw: string, expectedWeeks: number) {
        let json: unknown;
        try {
            json = JSON.parse(raw);
        } catch {
            throw new BadRequestException('AI returned invalid JSON; try again');
        }
        const result = PlanWeeksSchema.safeParse(json);
        if (!result.success) {
            throw new BadRequestException('AI plan JSON did not match the expected shape');
        }
        if (result.data.weeks.length !== expectedWeeks) {
            throw new BadRequestException(
                `AI returned ${result.data.weeks.length} weeks; expected ${expectedWeeks}`,
            );
        }
        return result.data;
    }

    /** Server computes week dates from startDate, skipping Fridays (BD weekend). */
    private fillDates(
        weeks: { topics: string[]; objective: string; assessment?: string | null }[],
        startDateStr: string,
    ): PlanWeek[] {
        const weeksOut: PlanWeek[] = [];
        let cursor = new Date(`${startDateStr}T00:00:00.000Z`);
        for (let i = 0; i < weeks.length; i++) {
            // Advance cursor off a Friday start.
            while (cursor.getUTCDay() === 5) cursor = new Date(cursor.getTime() + 86400000);
            const w = weeks[i];
            weeksOut.push({
                week: i + 1,
                startAt: cursor.toISOString().slice(0, 10),
                topics: w.topics,
                objective: w.objective,
                assessment: w.assessment ?? null,
                status: 'PLANNED',
            });
            cursor = new Date(cursor.getTime() + 7 * 86400000);
        }
        return weeksOut;
    }

    async update(
        id: string,
        userId: string,
        patch: { title?: string; weeks?: PlanWeek[]; status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' },
    ) {
        const teacherId = await this.resolveTeacherId(userId);
        const plan = await this.requireOwned(id, teacherId);
        // Activating archives any other ACTIVE plan for the same tuple.
        if (patch.status === 'ACTIVE') {
            await this.prisma.teachingPlan.updateMany({
                where: {
                    teacherId,
                    classId: plan.classId,
                    subjectId: plan.subjectId,
                    type: plan.type,
                    id: { not: id },
                    status: 'ACTIVE',
                },
                data: { status: 'ARCHIVED' },
            });
        }
        return this.prisma.teachingPlan.update({
            where: { id },
            data: {
                ...(patch.title !== undefined ? { title: patch.title } : {}),
                ...(patch.status !== undefined ? { status: patch.status } : {}),
                ...(patch.weeks !== undefined
                    ? { weeks: patch.weeks as unknown as Prisma.InputJsonValue }
                    : {}),
            },
        });
    }

    /** Mark one week DONE/PLANNED (drives syllabus progress %). */
    async setWeekStatus(id: string, weekNo: number, status: 'PLANNED' | 'DONE', userId: string) {
        const teacherId = await this.resolveTeacherId(userId);
        const plan = await this.requireOwned(id, teacherId);
        const weeks = plan.weeks as { week: number; status?: string }[];
        const next = weeks.map((w) => (w.week === weekNo ? { ...w, status } : w));
        return this.prisma.teachingPlan.update({ where: { id }, data: { weeks: next } });
    }

    async remove(id: string, userId: string) {
        const teacherId = await this.resolveTeacherId(userId);
        await this.requireOwned(id, teacherId);
        await this.prisma.teachingPlan.delete({ where: { id } });
        return { deleted: true };
    }

    /** JWT carries the User id; the FK references the Teacher row. Resolve it. */
    private async resolveTeacherId(userId: string): Promise<string> {
        const teacher = await this.prisma.teacher.findUnique({ where: { userId } });
        if (!teacher) throw new NotFoundException('No teacher profile for this user');
        return teacher.id;
    }

    private async requireOwned(id: string, teacherId: string) {
        const plan = await this.prisma.teachingPlan.findUnique({ where: { id } });
        if (!plan) throw new NotFoundException('Plan not found');
        if (plan.teacherId !== teacherId) throw new NotFoundException('Plan not found');
        return plan;
    }
}
