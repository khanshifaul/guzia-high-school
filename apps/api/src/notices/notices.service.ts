// src/notices/notices.service.ts — notices, audience-filtered per viewer.
import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateNoticeDto } from './dto';

@Injectable()
export class NoticesService {
    constructor(private readonly prisma: DatabaseService) {}

    /** A viewer sees global notices (audience null) + ones targeting their role. */
    async forViewer(viewerRole: string) {
        const notices = await this.prisma.notice.findMany({
            where: {
                OR: [{ audience: null }, { audience: viewerRole as 'STUDENT' }],
            },
            orderBy: { createdAt: 'desc' },
        });
        return { data: notices, meta: { total: notices.length } };
    }

    /** Public site: only global notices (audience null), latest first. */
    async publicNotices(limit = 6) {
        const notices = await this.prisma.notice.findMany({
            where: { audience: null },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        return { data: notices, meta: { total: notices.length } };
    }

    async create(dto: CreateNoticeDto, authorId: string) {
        return this.prisma.notice.create({
            data: {
                title: dto.title,
                body: dto.body,
                audience: dto.audience ?? null,
                authorId,
            },
        });
    }

    async remove(id: string) {
        await this.prisma.notice.delete({ where: { id } }).catch(() => {
            throw new NotFoundException('Notice not found');
        });
        return { deleted: true };
    }
}
