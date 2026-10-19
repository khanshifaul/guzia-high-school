// src/ai/plans/plans.service.spec.ts — protects the plan editing rules:
// a teacher may only touch their own plan, a single week is replaced in
// isolation, and the week dates skip Fridays (BD weekend).
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlansService, type PlanWeek } from './plans.service';

const TEACHER_USER_ID = 'teacher-user-1';
const TEACHER_ID = 'teacher-1';
const PLAN_ID = 'plan-1';

interface FakeState {
    plan: Record<string, unknown> | null;
    llmReply: string;
    lastUpdate: { weeks: PlanWeek[] } | null;
}

function week(n: number, over: Partial<PlanWeek> = {}): PlanWeek {
    return {
        week: n,
        startAt: `2026-01-${String(n).padStart(2, '0')}`,
        topics: [`Topic ${n}a`],
        objective: `Objective ${n}`,
        assessment: null,
        status: 'PLANNED',
        ...over,
    };
}

/** Minimal in-memory stand-in for the Prisma calls the plan flow makes. */
function serviceWith(state: FakeState): PlansService {
    const prisma = {
        teacher: {
            findUnique: async () => ({ id: TEACHER_ID }),
        },
        teachingPlan: {
            findUnique: async () => (state.plan ? { ...state.plan } : null),
            findMany: async () => (state.plan ? [{ ...state.plan }] : []),
            update: async ({
                where,
                data,
            }: {
                where: { id: string };
                data: { weeks?: PlanWeek[]; status?: string; title?: string };
            }) => {
                if (state.plan) Object.assign(state.plan, data);
                if (data.weeks) state.lastUpdate = { weeks: data.weeks };
                return { ...state.plan };
            },
            create: async ({ data }: { data: Record<string, unknown> }) => {
                state.plan = { id: PLAN_ID, ...data };
                return state.plan;
            },
            updateMany: async () => ({ count: 0 }),
            delete: async () => ({}),
        },
        class: {
            findUnique: async () => ({ id: 'class-1', name: 'Class 8' }),
        },
        subject: {
            findUnique: async () => ({ id: 'subject-1', name: 'Mathematics' }),
        },
    };

    const llm = {
        complete: async () => state.llmReply,
    };

    return new PlansService(prisma as never, llm as never);
}

function baseState(overrides: Partial<FakeState> = {}): FakeState {
    return {
        plan: {
            id: PLAN_ID,
            teacherId: TEACHER_ID,
            classId: 'class-1',
            subjectId: 'subject-1',
            type: 'TERM',
            title: 'Term plan',
            startDate: new Date('2026-01-01'),
            status: 'DRAFT',
            weeks: [week(1), week(2), week(3)],
        },
        llmReply: JSON.stringify({
            topics: ['New topic'],
            objective: 'New objective',
            assessment: null,
        }),
        lastUpdate: null,
        ...overrides,
    };
}

describe('PlansService ownership', () => {
    it('refuses a plan belonging to another teacher', async () => {
        const state = baseState();
        state.plan = { ...(state.plan as Record<string, unknown>), teacherId: 'teacher-other' };
        const service = serviceWith(state);
        await expect(service.findOne(PLAN_ID, TEACHER_USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('refuses to edit a week of another teacher\'s plan', async () => {
        const state = baseState();
        state.plan = { ...(state.plan as Record<string, unknown>), teacherId: 'teacher-other' };
        const service = serviceWith(state);
        await expect(
            service.updateWeek(PLAN_ID, 1, { objective: 'hijack' }, TEACHER_USER_ID),
        ).rejects.toThrow(NotFoundException);
    });
});

describe('updateWeek', () => {
    it('changes only the named week', async () => {
        const state = baseState();
        const service = serviceWith(state);
        await service.updateWeek(
            PLAN_ID,
            2,
            { topics: ['Edited topic'], objective: 'Edited objective' },
            TEACHER_USER_ID,
        );
        const weeks = state.lastUpdate?.weeks ?? [];
        expect(weeks[1].topics).toEqual(['Edited topic']);
        expect(weeks[1].objective).toBe('Edited objective');
        expect(weeks[0].topics).toEqual(['Topic 1a']);
        expect(weeks[2].topics).toEqual(['Topic 3a']);
    });

    it('leaves the week status and date alone', async () => {
        const state = baseState();
        state.plan = {
            ...(state.plan as Record<string, unknown>),
            weeks: [week(1), week(2, { status: 'DONE' }), week(3)],
        };
        const service = serviceWith(state);
        await service.updateWeek(PLAN_ID, 2, { objective: 'Edited' }, TEACHER_USER_ID);
        const edited = (state.lastUpdate?.weeks ?? [])[1];
        expect(edited.status).toBe('DONE');
        expect(edited.startAt).toBe('2026-01-02');
    });

    it('keeps a null assessment when the patch omits it', async () => {
        const state = baseState();
        state.plan = {
            ...(state.plan as Record<string, unknown>),
            weeks: [week(1), week(2, { assessment: 'Quiz' }), week(3)],
        };
        const service = serviceWith(state);
        await service.updateWeek(PLAN_ID, 2, { objective: 'Edited' }, TEACHER_USER_ID);
        expect((state.lastUpdate?.weeks ?? [])[1].assessment).toBe('Quiz');
    });

    it('rejects a week number that is not in the plan', async () => {
        const service = serviceWith(baseState());
        await expect(
            service.updateWeek(PLAN_ID, 9, { objective: 'nope' }, TEACHER_USER_ID),
        ).rejects.toThrow(NotFoundException);
    });
});

describe('regenerateWeek', () => {
    it('replaces only that week with the AI content', async () => {
        const state = baseState();
        const service = serviceWith(state);
        await service.regenerateWeek(PLAN_ID, 2, TEACHER_USER_ID);
        const weeks = state.lastUpdate?.weeks ?? [];
        expect(weeks[1].topics).toEqual(['New topic']);
        expect(weeks[1].objective).toBe('New objective');
        expect(weeks[0].topics).toEqual(['Topic 1a']);
        expect(weeks[2].topics).toEqual(['Topic 3a']);
    });

    it('keeps the teacher\'s own edits to the other weeks', async () => {
        const state = baseState();
        state.plan = {
            ...(state.plan as Record<string, unknown>),
            weeks: [week(1, { topics: ['Teacher wrote this'] }), week(2), week(3)],
        };
        const service = serviceWith(state);
        await service.regenerateWeek(PLAN_ID, 2, TEACHER_USER_ID);
        expect((state.lastUpdate?.weeks ?? [])[0].topics).toEqual(['Teacher wrote this']);
    });

    it('rejects a week number that is not in the plan', async () => {
        const service = serviceWith(baseState());
        await expect(service.regenerateWeek(PLAN_ID, 9, TEACHER_USER_ID)).rejects.toThrow(
            NotFoundException,
        );
    });

    it('rejects an AI reply that is not valid JSON', async () => {
        const state = baseState({ llmReply: 'not json at all' });
        const service = serviceWith(state);
        await expect(service.regenerateWeek(PLAN_ID, 1, TEACHER_USER_ID)).rejects.toThrow(
            BadRequestException,
        );
    });

    it('rejects an AI reply missing the objective', async () => {
        const state = baseState({ llmReply: JSON.stringify({ topics: ['Only topics'] }) });
        const service = serviceWith(state);
        await expect(service.regenerateWeek(PLAN_ID, 1, TEACHER_USER_ID)).rejects.toThrow(
            BadRequestException,
        );
    });
});

describe('generate', () => {
    it('rejects a week count outside 1-52', async () => {
        const service = serviceWith(baseState());
        await expect(
            service.generate(
                {
                    classId: 'class-1',
                    subjectId: 'subject-1',
                    type: 'TERM',
                    startDate: '2026-01-01',
                    weeks: 0,
                },
                TEACHER_USER_ID,
            ),
        ).rejects.toThrow(BadRequestException);
    });

    it('dates the weeks from the start date, skipping Fridays', async () => {
        const state = baseState({
            llmReply: JSON.stringify({
                title: 'Generated',
                weeks: [
                    { topics: ['A'], objective: 'o', assessment: null },
                    { topics: ['B'], objective: 'o', assessment: null },
                ],
            }),
        });
        const service = serviceWith(state);
        // 2026-01-02 is a Friday — the first week must start on the 3rd instead.
        const plan = await service.generate(
            {
                classId: 'class-1',
                subjectId: 'subject-1',
                type: 'TERM',
                startDate: '2026-01-02',
                weeks: 2,
            },
            TEACHER_USER_ID,
        );
        const weeks = plan.weeks as unknown as PlanWeek[];
        expect(weeks[0].startAt).toBe('2026-01-03');
        expect(weeks[1].startAt).toBe('2026-01-10');
    });

    it('rejects an AI reply with the wrong number of weeks', async () => {
        const state = baseState({
            llmReply: JSON.stringify({
                title: 'Generated',
                weeks: [{ topics: ['A'], objective: 'o', assessment: null }],
            }),
        });
        const service = serviceWith(state);
        await expect(
            service.generate(
                {
                    classId: 'class-1',
                    subjectId: 'subject-1',
                    type: 'TERM',
                    startDate: '2026-01-01',
                    weeks: 3,
                },
                TEACHER_USER_ID,
            ),
        ).rejects.toThrow(/expected 3/);
    });
});
