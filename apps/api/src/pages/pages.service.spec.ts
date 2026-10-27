// src/pages/pages.service.spec.ts — protects the two rules the public site and
// the editor depend on:
//   1. a public read never returns an unpublished block or page, and keeps the
//      admin order;
//   2. a seed only fills gaps — it never overwrites an edited row.
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PagesService } from './pages.service';
import { SEED_PAGES } from './page-seed';
import { BLOCK_KINDS } from './dto';

interface FakePage {
    id: string;
    slug: string;
    title: string;
    titleBn: string;
    published: boolean;
    updatedAt: Date;
    blocks: FakeBlock[];
}

interface FakeBlock {
    id: string;
    pageId: string;
    key: string;
    kind: string;
    sortOrder: number;
    bodyEn: string;
    bodyBn: string;
    imageUrl: string;
    linkUrl: string;
    published: boolean;
    createdAt: Date;
}

function block(overrides: Partial<FakeBlock> & { key: string }): FakeBlock {
    return {
        id: `id-${overrides.key}`,
        pageId: 'page-home',
        kind: 'cards',
        sortOrder: 10,
        bodyEn: '{}',
        bodyBn: '{}',
        imageUrl: '',
        linkUrl: '',
        published: true,
        createdAt: new Date('2026-01-01'),
        ...overrides,
    };
}

function page(overrides: Partial<FakePage> = {}): FakePage {
    return {
        id: 'page-home',
        slug: 'home',
        title: 'Home',
        titleBn: 'হোম',
        published: true,
        updatedAt: new Date('2026-01-01'),
        blocks: [],
        ...overrides,
    };
}

/**
 * Minimal Prisma double. `findUnique` applies the filters the service asks for
 * so the tests exercise the real query shape (published filter + sort order).
 */
function serviceWith(pages: FakePage[]) {
    const state = { created: 0, createdMany: [] as FakeBlock[], updates: [] as FakeBlock[] };

    const prisma = {
        page: {
            // Prisma applies `include.blocks.where` server-side; the double must
            // do the same or the published-filter assertion proves nothing.
            findUnique: async ({
                where,
                include,
            }: {
                where: { slug: string };
                include?: { blocks?: { where?: { published?: boolean } } };
            }) => {
                const found = pages.find((p) => p.slug === where.slug);
                if (!found) return null;
                const onlyPublished = include?.blocks?.where?.published;
                return {
                    ...found,
                    blocks: found.blocks
                        .filter(
                            (b) => onlyPublished === undefined || b.published === onlyPublished,
                        )
                        .sort(
                            (a, b) =>
                                a.sortOrder - b.sortOrder ||
                                a.createdAt.getTime() - b.createdAt.getTime(),
                        ),
                };
            },
            findMany: async () =>
                pages.map((p) => ({
                    ...p,
                    blocks: [...p.blocks].sort((a, b) => a.sortOrder - b.sortOrder),
                })),
            create: async ({ data }: { data: { slug: string; title: string } }) => {
                state.created += 1;
                return page({ slug: data.slug, title: data.title });
            },
            update: async ({ where, data }: { where: { slug: string }; data: object }) => {
                const found = pages.find((p) => p.slug === where.slug);
                return { ...found, ...data };
            },
        },
        block: {
            findUnique: async ({ where }: { where: { pageId_key: { key: string } } }) => {
                const keys = pages.flatMap((p) => p.blocks);
                return keys.find((b) => b.key === where.pageId_key.key) ?? null;
            },
            // The public read: filter by `where`, then order by sortOrder as the
            // service asked (the fake must sort, or order assertions prove nothing).
            findMany: async ({
                where,
                orderBy,
            }: {
                where?: Record<string, unknown>;
                orderBy?: { sortOrder: 'asc' | 'desc' }[];
            }) => {
                void orderBy;
                return pages
                    .flatMap((p) =>
                        p.blocks.filter(
                            (b) =>
                                !where ||
                                where.published === undefined ||
                                b.published === where.published,
                        ),
                    )
                    .sort(
                        (a, b) =>
                            a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime(),
                    );
            },
            create: async ({ data }: { data: Omit<FakeBlock, 'id' | 'createdAt'> }) => {
                const created = { ...data, id: `new-${state.created}`, createdAt: new Date() };
                state.created += 1;
                return created;
            },
            createMany: async ({ data }: { data: FakeBlock[] }) => {
                state.createdMany.push(...data);
                return { count: data.length };
            },
            update: async ({ where, data }: { where: { id: string }; data: Partial<FakeBlock> }) => {
                state.updates.push({ ...block({ key: where.id }), ...data, id: where.id });
                return state.updates[state.updates.length - 1];
            },
            delete: async () => ({ deleted: true }),
        },
        $transaction: async (queries: Promise<unknown>[]) => Promise.all(queries),
    };

    return { service: new PagesService(prisma as never), state };
}

describe('shipped content', () => {
    it('keeps every Bengali row alongside its English row', () => {
        // bodyFor() joins by position; a shorter Bengali list would shift every
        // later translation onto the wrong card.
        for (const seedPage of SEED_PAGES) {
            for (const block of seedPage.blocks) {
                const en = block.en.items;
                const bn = block.bn.items;
                if (Array.isArray(en) && Array.isArray(bn)) {
                    expect({ block: block.key, rows: bn.length }).toEqual({
                        block: block.key,
                        rows: en.length,
                    });
                }
            }
        }
    });

    it('uses only block kinds the API accepts', () => {
        const kinds = new Set<string>(BLOCK_KINDS);
        for (const seedPage of SEED_PAGES) {
            for (const block of seedPage.blocks) {
                expect({ block: block.key, known: kinds.has(block.kind) }).toEqual({
                    block: block.key,
                    known: true,
                });
            }
        }
    });
});

describe('PagesService', () => {
    describe('getPublished', () => {
        it('returns only published blocks, in the stored order, with both languages', async () => {
            const { service } = serviceWith([
                page({
                    blocks: [
                        block({
                            key: 'highlights',
                            sortOrder: 20,
                            bodyEn: '{"title":"Why"}',
                            bodyBn: '{"title":"কেন"}',
                        }),
                        block({ key: 'draft', sortOrder: 30, published: false }),
                        block({ key: 'stats', sortOrder: 10, bodyEn: '{"items":[]}' }),
                    ],
                }),
            ]);

            const result = await service.getPublished('home');

            expect(result.blocks.map((b) => b.key)).toEqual(['stats', 'highlights']);
            const highlights = result.blocks.find((b) => b.key === 'highlights');
            expect(highlights?.bodyEn).toContain('Why');
            expect(highlights?.bodyBn).toContain('কেন');
        });

        it('refuses a page that is not published', async () => {
            const { service } = serviceWith([page({ published: false })]);
            await expect(service.getPublished('home')).rejects.toBeInstanceOf(NotFoundException);
        });

        it('refuses a slug that does not exist', async () => {
            const { service } = serviceWith([]);
            await expect(service.getPublished('missing')).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('seed', () => {
        it('creates every shipped page when the database is empty', async () => {
            const { service, state } = serviceWith([]);
            await service.getPublished('home').catch(() => undefined);
            expect(state.created).toBe(SEED_PAGES.length);
        });

        it('does not rewrite a block an admin already owns', async () => {
            const edited = block({
                key: 'highlights',
                bodyEn: '{"title":"Edited by admin"}',
                bodyBn: '{"title":"সম্পাদিত"}',
            });
            // Every shipped page already exists, as it does after the first read.
            const existing = SEED_PAGES.map((seed) =>
                page({
                    id: `page-${seed.slug}`,
                    slug: seed.slug,
                    title: seed.title,
                    blocks: seed.slug === 'home' ? [edited] : [],
                }),
            );
            const { service, state } = serviceWith(existing);

            await service.adminGet('home');

            expect(state.created).toBe(0);
            expect(state.createdMany.some((b) => b.key === 'highlights')).toBe(false);
            expect(state.createdMany.some((b) => b.pageId === 'page-home' && b.key === 'stats')).toBe(
                true,
            );
        });

        it('backfills only the shipped block that is missing', async () => {
            const { service, state } = serviceWith([
                page({ blocks: [block({ key: 'stats' })] }),
            ]);

            await service.adminGet('home');

            const backfilled = state.createdMany.map((b) => b.key);
            expect(backfilled).toEqual(
                SEED_PAGES.find((p) => p.slug === 'home')?.blocks
                    .map((b) => b.key)
                    .filter((key) => key !== 'stats'),
            );
        });
    });

    describe('admin writes', () => {
        it('rejects a body that is not a JSON object', async () => {
            const { service } = serviceWith([page({ blocks: [block({ key: 'stats' })] })]);
            await expect(
                service.updateBlock('home', 'id-stats', { bodyEn: 'not json' }),
            ).rejects.toBeInstanceOf(BadRequestException);
            await expect(
                service.updateBlock('home', 'id-stats', { bodyBn: '[1,2]' }),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('refuses a block that belongs to another page', async () => {
            const { service } = serviceWith([page({ blocks: [] })]);
            await expect(
                service.updateBlock('home', 'id-elsewhere', { published: false }),
            ).rejects.toBeInstanceOf(NotFoundException);
        });

        it('refuses a duplicate key on the same page', async () => {
            const { service } = serviceWith([page({ blocks: [block({ key: 'stats' })] })]);
            await expect(
                service.createBlock('home', { key: 'stats', kind: 'cards' }),
            ).rejects.toBeInstanceOf(ConflictException);
        });

        it('refuses a reorder that drops, duplicates or borrows a block', async () => {
            const { service } = serviceWith([
                page({ blocks: [block({ key: 'a' }), block({ key: 'b' })] }),
            ]);
            await expect(service.reorder('home', { order: ['id-a'] })).rejects.toBeInstanceOf(
                BadRequestException,
            );
            await expect(
                service.reorder('home', { order: ['id-a', 'id-a'] }),
            ).rejects.toBeInstanceOf(BadRequestException);
            await expect(
                service.reorder('home', { order: ['id-a', 'id-other'] }),
            ).rejects.toBeInstanceOf(BadRequestException);
        });
    });
});
