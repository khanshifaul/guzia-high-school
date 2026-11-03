// src/ai/sources/retrieval.service.spec.ts — embedding sweep reuse/dedupe.
// Prisma is mocked: the contract under test is what reaches the model and the
// database, not what Postgres answers.
import { DatabaseService } from '../../database/database.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { RetrievalService } from './retrieval.service';

interface PrismaMock {
    $queryRaw: jest.Mock;
    $executeRaw: jest.Mock;
}

function makeService(existingVectors: unknown[] = []) {
    const prisma: PrismaMock = {
        $queryRaw: jest.fn().mockResolvedValue(existingVectors),
        $executeRaw: jest.fn().mockResolvedValue(1),
    };
    const embeddings = {
        embed: jest.fn(async (texts: string[]) => texts.map(() => [0.25, 0.5])),
        embedOne: jest.fn(),
    };
    const service = new RetrievalService(
        prisma as unknown as DatabaseService,
        embeddings as unknown as EmbeddingsService,
    );
    return { service, prisma, embeddings };
}

describe('RetrievalService.embedChunks', () => {
    it('copies a stored vector for the same document + hash instead of calling the model', async () => {
        const { service, prisma, embeddings } = makeService([
            { documentId: 'doc-1', contentHash: 'hash-a', embeddingText: '[0.1,0.2]' },
        ]);

        const stats = await service.embedChunks([
            { id: 'chunk-1', content: 'the same text', documentId: 'doc-1', contentHash: 'hash-a' },
        ]);

        expect(stats).toEqual({ embedded: 0, reused: 1, deduped: 0 });
        expect(embeddings.embed).not.toHaveBeenCalled();
        expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
        const [, ids, vectors] = prisma.$executeRaw.mock.calls[0];
        expect(ids).toEqual(['chunk-1']);
        expect(vectors).toEqual(['[0.1,0.2]']);
    });

    it('embeds each distinct text once and fans it out to every occurrence', async () => {
        const { service, prisma, embeddings } = makeService([]);

        const stats = await service.embedChunks([
            { id: 'chunk-1', content: 'same text', documentId: 'doc-1', contentHash: 'hash-a' },
            { id: 'chunk-2', content: 'same text', documentId: 'doc-1', contentHash: 'hash-a' },
            { id: 'chunk-3', content: 'other text', documentId: 'doc-1', contentHash: 'hash-b' },
        ]);

        expect(embeddings.embed).toHaveBeenCalledTimes(1);
        expect(embeddings.embed).toHaveBeenCalledWith(['same text', 'other text']);
        expect(stats).toEqual({ embedded: 3, reused: 0, deduped: 1 });
        const [, ids, vectors] = prisma.$executeRaw.mock.calls[0];
        expect(ids).toEqual(['chunk-1', 'chunk-2', 'chunk-3']);
        expect(vectors).toEqual(['[0.25,0.5]', '[0.25,0.5]', '[0.25,0.5]']);
    });

    it('still embeds legacy rows that have no document or hash', async () => {
        const { service, prisma, embeddings } = makeService([]);

        const stats = await service.embedChunks([{ id: 'chunk-1', content: 'legacy text' }]);

        expect(stats).toEqual({ embedded: 1, reused: 0, deduped: 0 });
        expect(embeddings.embed).toHaveBeenCalledWith(['legacy text']);
        // No document/hash scope → the reuse lookup is skipped entirely.
        expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('returns zero stats when the model call fails (never throws)', async () => {
        const { service, embeddings } = makeService([]);
        embeddings.embed.mockRejectedValue(new Error('provider down'));

        await expect(
            service.embedChunks([{ id: 'chunk-1', content: 'text', documentId: 'd', contentHash: 'h' }]),
        ).resolves.toEqual({ embedded: 0, reused: 0, deduped: 0 });
    });

    it('makes no model call for an empty sweep', async () => {
        const { service, embeddings } = makeService([]);
        await expect(service.embedChunks([])).resolves.toEqual({
            embedded: 0,
            reused: 0,
            deduped: 0,
        });
        expect(embeddings.embed).not.toHaveBeenCalled();
    });
});
