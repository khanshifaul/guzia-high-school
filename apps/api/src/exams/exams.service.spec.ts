// src/exams/exams.service.spec.ts — protects the rules the admin grade-scale
// editor and the exam list depend on:
//   - the canonical band set must be contiguous and cover 0–100 exactly,
//   - a rejected band set must not touch the stored bands,
//   - the stored bands come back highest-first so the editor can render them
//     in the order a teacher reads them,
//   - an exam cannot be created for a class that does not exist, nor twice
//     for the same class.
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ExamsService } from './exams.service';
import type { Band } from './grading.util';

interface StoredBand extends Band {
    id: string;
}

interface FakeState {
    bands: StoredBand[];
    classExists: boolean;
    existingExam: { id: string } | null;
    created: { name: string; classId: string; startDate: Date; endDate: Date }[];
}

const CANONICAL: Band[] = [
    { minPercent: 80, maxPercent: 100, letter: 'A+', point: 4.0 },
    { minPercent: 70, maxPercent: 79, letter: 'A', point: 3.5 },
    { minPercent: 60, maxPercent: 69, letter: 'A-', point: 3.0 },
    { minPercent: 50, maxPercent: 59, letter: 'B', point: 2.5 },
    { minPercent: 40, maxPercent: 49, letter: 'C', point: 2.0 },
    { minPercent: 33, maxPercent: 39, letter: 'D', point: 1.0 },
    { minPercent: 0, maxPercent: 32, letter: 'F', point: 0.0 },
];

function serviceWith(state: FakeState): ExamsService {
    const prisma = {
        class: {
            findUnique: async () => (state.classExists ? { id: 'class-1', name: 'Class 8' } : null),
        },
        exam: {
            findFirst: async () => state.existingExam,
            create: async ({ data }: { data: FakeState['created'][number] }) => {
                state.created.push(data);
                return { id: 'exam-1', ...data };
            },
        },
        gradeBand: {
            findMany: async () => state.bands,
            deleteMany: async () => {
                state.bands = [];
                return { count: state.bands.length };
            },
            createMany: async ({ data }: { data: Band[] }) => {
                state.bands = data.map((b, i) => ({ id: `band-${i}`, ...b }));
                return { count: data.length };
            },
        },
        $transaction: async (ops: Array<Promise<unknown>>) => {
            for (const op of ops) await op;
        },
    };

    return new ExamsService(prisma as never);
}

function baseState(overrides: Partial<FakeState> = {}): FakeState {
    return {
        bands: CANONICAL.map((b, i) => ({ id: `band-${i}`, ...b })),
        classExists: true,
        existingExam: null,
        created: [],
        ...overrides,
    };
}

describe('ExamsService — grade bands', () => {
    describe('bands()', () => {
        it('returns the stored bands', async () => {
            const service = serviceWith(baseState());
            const bands = await service.bands();
            expect(bands).toHaveLength(7);
            expect(bands[0]).toMatchObject({ letter: 'A+', minPercent: 80, maxPercent: 100, point: 4 });
        });
    });

    describe('replaceBands()', () => {
        it('accepts the canonical scale and stores it highest-first', async () => {
            const state = baseState();
            const service = serviceWith(state);
            const stored = await service.replaceBands(CANONICAL);
            expect(stored[0].minPercent).toBeGreaterThan(stored[1].minPercent);
            expect(state.bands).toHaveLength(7);
        });

        it('sorts a shuffled set before storing it', async () => {
            const state = baseState();
            const service = serviceWith(state);
            const shuffled = [CANONICAL[5], CANONICAL[0], CANONICAL[3], CANONICAL[1], CANONICAL[6], CANONICAL[2], CANONICAL[4]];
            const stored = await service.replaceBands(shuffled);
            expect(stored.map((b) => b.minPercent)).toEqual([80, 70, 60, 50, 40, 33, 0]);
        });

        it('rejects an empty set', async () => {
            const service = serviceWith(baseState());
            await expect(service.replaceBands([])).rejects.toBeInstanceOf(BadRequestException);
        });

        it('rejects a gap between two bands and leaves the stored set alone', async () => {
            const state = baseState();
            const service = serviceWith(state);
            const withGap = CANONICAL.map((b) =>
                b.letter === 'A' ? { ...b, minPercent: 75 } : b,
            );
            await expect(service.replaceBands(withGap)).rejects.toThrow(/contiguous/i);
            expect(state.bands).toHaveLength(7);
            expect(state.bands.find((b) => b.letter === 'A')?.minPercent).toBe(70);
        });

        it('rejects an overlapping pair', async () => {
            const service = serviceWith(baseState());
            const overlapping = CANONICAL.map((b) =>
                b.letter === 'A' ? { ...b, minPercent: 71 } : b,
            );
            await expect(service.replaceBands(overlapping)).rejects.toThrow(/contiguous/i);
        });

        it('rejects a set that does not reach 100', async () => {
            const service = serviceWith(baseState());
            const short = CANONICAL.map((b) =>
                b.letter === 'A+' ? { ...b, maxPercent: 99 } : b,
            );
            await expect(service.replaceBands(short)).rejects.toThrow(/cover 0–100/i);
        });

        it('rejects a set that does not reach 0', async () => {
            const service = serviceWith(baseState());
            const high = CANONICAL.map((b) =>
                b.letter === 'F' ? { ...b, minPercent: 1 } : b,
            );
            await expect(service.replaceBands(high)).rejects.toThrow(/cover 0–100/i);
        });

        it('rejects a band outside 0–100', async () => {
            const service = serviceWith(baseState());
            const outOfRange = CANONICAL.map((b) =>
                b.letter === 'A+' ? { ...b, maxPercent: 120 } : b,
            );
            await expect(service.replaceBands(outOfRange)).rejects.toThrow(/within 0–100/i);
        });

        it('rejects a band whose minimum is above its maximum', async () => {
            const service = serviceWith(baseState());
            const inverted = CANONICAL.map((b) =>
                b.letter === 'B' ? { ...b, minPercent: 59, maxPercent: 50 } : b,
            );
            await expect(service.replaceBands(inverted)).rejects.toThrow(/within 0–100/i);
        });
    });

    describe('create()', () => {
        it('creates an exam with its dates', async () => {
            const state = baseState();
            const service = serviceWith(state);
            await service.create({
                name: 'Unit Test 2026',
                classId: 'class-1',
                startDate: '2026-11-01',
                endDate: '2026-11-10',
            });
            expect(state.created).toHaveLength(1);
            expect(state.created[0].startDate).toBeInstanceOf(Date);
        });

        it('refuses an exam for a class that does not exist', async () => {
            const service = serviceWith(baseState({ classExists: false }));
            await expect(
                service.create({
                    name: 'Unit Test 2026',
                    classId: 'missing',
                    startDate: '2026-11-01',
                    endDate: '2026-11-10',
                }),
            ).rejects.toBeInstanceOf(NotFoundException);
        });

        it('refuses a duplicate exam name for the same class', async () => {
            const service = serviceWith(baseState({ existingExam: { id: 'exam-1' } }));
            await expect(
                service.create({
                    name: 'Unit Test 2026',
                    classId: 'class-1',
                    startDate: '2026-11-01',
                    endDate: '2026-11-10',
                }),
            ).rejects.toBeInstanceOf(ConflictException);
        });
    });
});
