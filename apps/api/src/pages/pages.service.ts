// src/pages/pages.service.ts — public page content (Page + ordered Blocks).
//
// Reads seed any missing page/block from page-seed.ts first, exactly the way
// SiteSettingsService creates its singleton on first read: the database is the
// runtime source, and a fresh environment still renders the shipped content.
// The seed only INSERTs keys that are absent — an admin edit always wins.
import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SEED_PAGES, type SeedBlock } from './page-seed';
import { CreateBlockDto, ReorderBlocksDto, UpdateBlockDto, UpdatePageDto } from './dto';

/** Blocks are ordered by 10s so an admin can always insert between two. */
const ORDER_STEP = 10;

/** Postgres unique-violation, checked structurally so the service does not
 *  depend on a generated client error class. */
function isUniqueViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('code' in error)) return false;
    return error.code === 'P2002';
}

/** Bodies are JSON text; anything that is not a JSON object is a 400. */
function assertJsonObject(raw: string | undefined, field: string): void {
    if (raw === undefined) return;
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new BadRequestException(`${field} must be valid JSON`);
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new BadRequestException(`${field} must be a JSON object`);
    }
}

@Injectable()
export class PagesService {
    constructor(private readonly prisma: DatabaseService) {}

    /** One shared seed run per process; a failure clears it so the next read retries. */
    private seedRun: Promise<void> | null = null;

    // ─── Public read ─────────────────────────────────────────────────

    /** The public page: published blocks only, both languages, in order. */
    async getPublished(slug: string) {
        await this.ensureSeed();
        const page = await this.prisma.page.findUnique({
            where: { slug },
            include: {
                blocks: {
                    where: { published: true },
                    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
                },
            },
        });
        if (!page || !page.published) {
            throw new NotFoundException(`Page "${slug}" is not published`);
        }
        return {
            slug: page.slug,
            title: page.title,
            titleBn: page.titleBn,
            published: page.published,
            blocks: page.blocks,
        };
    }

    // ─── Admin ───────────────────────────────────────────────────────

    /** Every page, published or not, with its blocks summarised. */
    async adminList() {
        await this.ensureSeed();
        const pages = await this.prisma.page.findMany({
            orderBy: { slug: 'asc' },
            include: {
                blocks: {
                    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
                    select: { id: true, key: true, kind: true, published: true },
                },
            },
        });
        return pages.map((page) => ({
            slug: page.slug,
            title: page.title,
            titleBn: page.titleBn,
            published: page.published,
            updatedAt: page.updatedAt,
            blockCount: page.blocks.length,
            publishedBlockCount: page.blocks.filter((block) => block.published).length,
            blocks: page.blocks,
        }));
    }

    /** One page with every block, for the editor. */
    async adminGet(slug: string) {
        await this.ensureSeed();
        return this.requirePage(slug);
    }

    async updatePage(slug: string, dto: UpdatePageDto) {
        await this.ensureSeed();
        await this.requirePage(slug);
        return this.prisma.page.update({ where: { slug }, data: { ...dto } });
    }

    async createBlock(slug: string, dto: CreateBlockDto) {
        await this.ensureSeed();
        const page = await this.requirePage(slug);
        assertJsonObject(dto.bodyEn, 'bodyEn');
        assertJsonObject(dto.bodyBn, 'bodyBn');

        const duplicate = await this.prisma.block.findUnique({
            where: { pageId_key: { pageId: page.id, key: dto.key } },
            select: { id: true },
        });
        if (duplicate) {
            throw new ConflictException(`Block "${dto.key}" already exists on this page`);
        }

        const lastOrder = page.blocks.reduce(
            (max, block) => Math.max(max, block.sortOrder),
            -ORDER_STEP,
        );
        return this.prisma.block.create({
            data: {
                pageId: page.id,
                key: dto.key,
                kind: dto.kind,
                sortOrder: dto.sortOrder ?? lastOrder + ORDER_STEP,
                bodyEn: dto.bodyEn ?? '{}',
                bodyBn: dto.bodyBn ?? '{}',
                imageUrl: dto.imageUrl ?? '',
                linkUrl: dto.linkUrl ?? '',
                published: dto.published ?? true,
            },
        });
    }

    async updateBlock(slug: string, blockId: string, dto: UpdateBlockDto) {
        await this.ensureSeed();
        const block = await this.requireBlock(slug, blockId);
        assertJsonObject(dto.bodyEn, 'bodyEn');
        assertJsonObject(dto.bodyBn, 'bodyBn');
        return this.prisma.block.update({ where: { id: block.id }, data: { ...dto } });
    }

    async deleteBlock(slug: string, blockId: string) {
        await this.ensureSeed();
        await this.requireBlock(slug, blockId);
        await this.prisma.block.delete({ where: { id: blockId } });
        return { deleted: true };
    }

    /** Apply the full list of block ids as the page order. */
    async reorder(slug: string, dto: ReorderBlocksDto) {
        await this.ensureSeed();
        const page = await this.requirePage(slug);
        const known = new Set(page.blocks.map((block) => block.id));
        const requested = new Set(dto.order);

        if (dto.order.length !== known.size || requested.size !== dto.order.length) {
            throw new BadRequestException(
                'order must list every block on the page exactly once',
            );
        }
        for (const id of dto.order) {
            if (!known.has(id)) {
                throw new BadRequestException('order contains a block from another page');
            }
        }

        await this.prisma.$transaction(
            dto.order.map((id, index) =>
                this.prisma.block.update({
                    where: { id },
                    data: { sortOrder: index * ORDER_STEP },
                }),
            ),
        );
        return this.adminGet(slug);
    }

    // ─── Internals ───────────────────────────────────────────────────

    private async requirePage(slug: string) {
        const page = await this.prisma.page.findUnique({
            where: { slug },
            include: {
                blocks: {
                    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
                },
            },
        });
        if (!page) throw new NotFoundException(`Page "${slug}" not found`);
        return page;
    }

    private async requireBlock(slug: string, blockId: string) {
        const page = await this.requirePage(slug);
        const block = page.blocks.find((candidate) => candidate.id === blockId);
        if (!block) throw new NotFoundException(`Block "${blockId}" not found on "${slug}"`);
        return block;
    }

    private ensureSeed(): Promise<void> {
        if (!this.seedRun) {
            this.seedRun = this.runSeed().catch((error: unknown) => {
                this.seedRun = null;
                throw error;
            });
        }
        return this.seedRun;
    }

    private async runSeed(): Promise<void> {
        for (const seedPage of SEED_PAGES) {
            const existing = await this.prisma.page.findUnique({
                where: { slug: seedPage.slug },
                include: { blocks: { select: { key: true } } },
            });

            if (!existing) {
                await this.prisma.page
                    .create({
                        data: {
                            slug: seedPage.slug,
                            title: seedPage.title,
                            titleBn: seedPage.titleBn,
                            blocks: {
                                create: seedPage.blocks.map((block, index) =>
                                    this.blockData(block, index),
                                ),
                            },
                        },
                    })
                    .catch((error: unknown) => {
                        if (!isUniqueViolation(error)) throw error;
                    });
                continue;
            }

            const present = new Set(existing.blocks.map((block) => block.key));
            const missing = seedPage.blocks
                .map((block, index) => ({ block, index }))
                .filter(({ block }) => !present.has(block.key));
            if (missing.length === 0) continue;

            await this.prisma.block
                .createMany({
                    data: missing.map(({ block, index }) => ({
                        pageId: existing.id,
                        ...this.blockData(block, index),
                    })),
                })
                .catch((error: unknown) => {
                    if (!isUniqueViolation(error)) throw error;
                });
        }
    }

    private blockData(block: SeedBlock, index: number) {
        return {
            key: block.key,
            kind: block.kind,
            sortOrder: index * ORDER_STEP,
            bodyEn: JSON.stringify(block.en),
            bodyBn: JSON.stringify(block.bn),
            imageUrl: block.imageUrl ?? '',
            linkUrl: block.linkUrl ?? '',
            published: true,
        };
    }
}
