// src/ai/embeddings/embeddings.service.spec.ts — dedupe, fan-out and the
// batch/concurrency contract. The provider itself is stubbed: this is about
// what the service asks the model, not what the model answers.
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../database/database.service';
import { EmbeddingsService } from './embeddings.service';

const REMOTE_DIMENSIONS = 2048;

function remoteService(): EmbeddingsService {
    const config = new ConfigService({
        EMBEDDINGS_PROVIDER: 'nvidia',
        NVIDIA_API_KEY: 'test-key',
    });
    return new EmbeddingsService(config, {} as DatabaseService);
}

type EmbedMany = (texts: string[]) => Promise<number[][]>;

function stubProvider(service: EmbeddingsService, embed: EmbedMany): jest.SpyInstance {
    return jest
        .spyOn(service as unknown as { embedRemote: EmbedMany }, 'embedRemote')
        .mockImplementation(embed);
}

describe('EmbeddingsService.embed', () => {
    it('calls the provider once per distinct normalized text and fans the vector out', async () => {
        const service = remoteService();
        const spy = stubProvider(service, async (texts) =>
            texts.map((_, index) => [index, REMOTE_DIMENSIONS]),
        );

        const vectors = await service.embed([
            'same text',
            ' same text ',
            'other text',
            'same text',
        ]);

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy.mock.calls[0][0]).toEqual(['same text', 'other text']);
        expect(vectors).toHaveLength(4);
        // Same input → the very same vector, in every occurrence.
        expect(vectors[0]).toEqual([0, REMOTE_DIMENSIONS]);
        expect(vectors[1]).toEqual(vectors[0]);
        expect(vectors[2]).toEqual([1, REMOTE_DIMENSIONS]);
        expect(vectors[3]).toEqual(vectors[0]);
    });

    it('substitutes one placeholder for every empty/whitespace input', async () => {
        const service = remoteService();
        const spy = stubProvider(service, async (texts) => texts.map(() => [1]));

        await service.embed(['', '   ', '\n']);

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy.mock.calls[0][0]).toEqual([' ']);
    });
});

describe('EmbeddingsService remote batching', () => {
    it('sends at most 64 inputs per request and keeps at most 4 in flight', async () => {
        const service = remoteService();
        const originalFetch = global.fetch;
        const batchSizes: number[] = [];
        let inFlight = 0;
        let maxInFlight = 0;

        global.fetch = jest.fn(async (_url: unknown, init?: { body?: string }) => {
            inFlight += 1;
            maxInFlight = Math.max(maxInFlight, inFlight);
            const body = JSON.parse(init?.body ?? '{}') as { input: string[] };
            batchSizes.push(body.input.length);
            // Hold the request open long enough for other batches to overlap.
            const { promise, resolve } = Promise.withResolvers<void>();
            setTimeout(resolve, 5);
            await promise;
            inFlight -= 1;
            return {
                ok: true,
                json: async () => ({
                    data: body.input.map(() => ({ embedding: Array.from({ length: REMOTE_DIMENSIONS }, () => 0) })),
                }),
            } as unknown as Response;
        }) as unknown as typeof fetch;

        try {
            const texts = Array.from({ length: 130 }, (_, index) => `text ${index}`);
            const vectors = await service.embed(texts);

            expect(vectors).toHaveLength(130);
            expect(Math.max(...batchSizes)).toBeLessThanOrEqual(64);
            expect(batchSizes.reduce((sum, size) => sum + size, 0)).toBe(130);
            expect(maxInFlight).toBeLessThanOrEqual(4);
        } finally {
            global.fetch = originalFetch;
        }
    });
});
