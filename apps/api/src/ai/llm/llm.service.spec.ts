// src/ai/llm/llm.service.spec.ts — protects the offline mock provider.
//
// The mock fixtures must honour the counts the caller asked for: the
// generator services validate the reply against the requested mix, so a
// fixed-size fixture made every non-default blueprint fail offline.
import { LlmService } from './llm.service';
import { DatabaseService } from '../../database/database.service';
import { ConfigService } from '@nestjs/config';

function serviceWithMockProvider(): LlmService {
    const prisma = {
        aiProviderConfig: {
            findUnique: async () => ({
                id: 'singleton',
                name: 'mock',
                baseUrl: '',
                textModel: 'mock',
                visionModel: null,
                apiKeyEnc: null,
                apiKeyHint: null,
                temperature: 0.3,
                maxTokens: 2048,
                enabled: true,
                updatedById: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            }),
        },
    } as unknown as DatabaseService;
    const config = {
        get: () => undefined,
    } as unknown as ConfigService;
    return new LlmService(prisma, config);
}

describe('LlmService mock provider', () => {
    it('sizes the paper fixture to the requested question mix', async () => {
        const raw = await serviceWithMockProvider().complete({
            system: 's',
            user: 'u',
            json: true,
            mockFixture: 'paper',
            mockCounts: { mcq: 10, short: 5, long: 3 },
        });
        const paper = JSON.parse(raw) as {
            groups: { type: string; questions: unknown[] }[];
        };
        const byType = (t: string) => paper.groups.find((g) => g.type === t)?.questions.length ?? 0;
        expect(byType('MCQ')).toBe(10);
        expect(byType('SHORT')).toBe(5);
        expect(byType('LONG')).toBe(3);
    });

    it('gives every MCQ exactly four options', async () => {
        const raw = await serviceWithMockProvider().complete({
            system: 's',
            user: 'u',
            json: true,
            mockFixture: 'paper',
            mockCounts: { mcq: 2, short: 1, long: 1 },
        });
        const paper = JSON.parse(raw) as {
            groups: { type: string; questions: { options?: string[] }[] }[];
        };
        const mcqs = paper.groups.find((g) => g.type === 'MCQ')!.questions;
        for (const q of mcqs) {
            expect(q.options).toHaveLength(4);
        }
    });
    it('omits groups the blueprint did not ask for', async () => {
        const raw = await serviceWithMockProvider().complete({
            system: 's',
            user: 'u',
            json: true,
            mockFixture: 'paper',
            mockCounts: { mcq: 1, short: 0, long: 0 },
        });
        const paper = JSON.parse(raw) as { groups: { type: string; questions: unknown[] }[] };
        expect(paper.groups.map((g) => g.type)).toEqual(['MCQ']);
    });

    it('sizes the plan fixture to the requested week count', async () => {
        const raw = await serviceWithMockProvider().complete({
            system: 's',
            user: 'u',
            json: true,
            mockFixture: 'plan',
            mockCounts: { weeks: 16 },
        });
        const plan = JSON.parse(raw) as { weeks: unknown[] };
        expect(plan.weeks).toHaveLength(16);
    });
});
