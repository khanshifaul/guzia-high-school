// src/workspaces/workspaces.service.ts — the teacher's Studio workspaces.
//
// A workspace holds pointers to the teacher's library sources (attaching is
// never a re-upload) and ONE conversation. The ChatThread row is created
// lazily on the first message; the user never manages threads.
// On first use the default workspace is created with the teacher's existing
// sources attached, so the cutover loses nothing.
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'prisma/generated/client';
import { DatabaseService } from '../database/database.service';
import { resolveTeacherId } from '../common/access/teacher-access.util';
import { SourcesService } from '../ai/sources/sources.service';
import type { AttachSourcesDto, CreateWorkspaceDto, UpdateWorkspaceDto } from './dto';

const DEFAULT_TITLE = 'My workspace';
const UNTITLED = 'Untitled workspace';
/** Prior turns replayed into the model; matches the sources-ask contract. */
const HISTORY_TURNS = 10;

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly sources: SourcesService,
  ) {}

  /**
   * Every workspace the teacher owns, newest first, with the card data:
   * source count, whether it has a conversation, and that conversation's
   * newest line.
   */
  async list(userId: string) {
    const teacherId = await resolveTeacherId(this.prisma, userId);
    await this.ensureDefault(teacherId);

    const workspaces = await this.prisma.workspace.findMany({
      where: { ownerId: teacherId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { sources: true } },
        thread: {
          select: {
            id: true,
            updatedAt: true,
            messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { content: true } },
          },
        },
      },
    });

    const classIds = [
      ...new Set(workspaces.map((workspace) => workspace.classId).filter((id): id is string => Boolean(id))),
    ];
    const subjectIds = [
      ...new Set(workspaces.map((workspace) => workspace.subjectId).filter((id): id is string => Boolean(id))),
    ];

    const ids = workspaces.map((workspace) => workspace.id);
    const [classRows, subjectRows, pendingRows] = await Promise.all([
      classIds.length
        ? this.prisma.class.findMany({ where: { id: { in: classIds } }, select: { id: true, name: true } })
        : Promise.resolve([] as { id: string; name: string }[]),
      subjectIds.length
        ? this.prisma.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, name: true } })
        : Promise.resolve([] as { id: string; name: string }[]),
      ids.length
        ? this.prisma.workspaceSource.findMany({
            where: { workspaceId: { in: ids }, source: { status: { not: 'READY' } } },
            select: { workspaceId: true },
          })
        : Promise.resolve([] as { workspaceId: string }[]),
    ]);
    const processing = new Set(pendingRows.map((row) => row.workspaceId));
    const classById = new Map(classRows.map((row) => [row.id, row]));
    const subjectById = new Map(subjectRows.map((row) => [row.id, row]));

    return workspaces.map((workspace) => ({
      id: workspace.id,
      title: workspace.title,
      class: workspace.classId ? classById.get(workspace.classId) ?? null : null,
      subject: workspace.subjectId ? subjectById.get(workspace.subjectId) ?? null : null,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      sourceCount: workspace._count.sources,
      chatCount: workspace.thread?.messages.length ? 1 : 0,
      lastMessage: workspace.thread?.messages[0]?.content ?? null,
      hasProcessing: processing.has(workspace.id),
    }));
  }

  /** One workspace with its attached sources and its conversation. */
  async findOne(userId: string, id: string) {
    const teacherId = await resolveTeacherId(this.prisma, userId);
    const workspace = await this.prisma.workspace.findFirst({
      where: { id, ownerId: teacherId },
      include: {
        sources: {
          orderBy: { addedAt: 'desc' },
          select: {
            addedAt: true,
            source: {
              select: {
                id: true,
                filename: true,
                kind: true,
                pages: true,
                status: true,
                classId: true,
                subjectId: true,
                createdAt: true,
                summary: true,
              },
            },
          },
        },
        thread: { select: { id: true, messages: { orderBy: { createdAt: 'asc' } } } },
      },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');

    const [cls, subject] = await Promise.all([
      workspace.classId
        ? this.prisma.class.findUnique({ where: { id: workspace.classId }, select: { id: true, name: true } })
        : null,
      workspace.subjectId
        ? this.prisma.subject.findUnique({ where: { id: workspace.subjectId }, select: { id: true, name: true } })
        : null,
    ]);

    const { sources, thread, ...rest } = workspace;
    return {
      ...rest,
      class: cls,
      subject,
      sources: sources.map((row) => {
        const { summary, ...source } = row.source;
        return {
          ...source,
          addedAt: row.addedAt,
          error: ((summary as { error?: string } | null) ?? null)?.error ?? null,
        };
      }),
      messages: thread?.messages ?? [],
    };
  }

  async create(userId: string, dto: CreateWorkspaceDto) {
    const teacherId = await resolveTeacherId(this.prisma, userId);
    return this.prisma.workspace.create({
      data: {
        ownerId: teacherId,
        title: dto.title?.trim() || UNTITLED,
        classId: dto.classId || null,
        subjectId: dto.subjectId || null,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateWorkspaceDto) {
    await this.requireOwned(userId, id);
    return this.prisma.workspace.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() || UNTITLED } : {}),
        ...(dto.classId !== undefined ? { classId: dto.classId || null } : {}),
        ...(dto.subjectId !== undefined ? { subjectId: dto.subjectId || null } : {}),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.requireOwned(userId, id);
    await this.prisma.workspace.delete({ where: { id } });
    return { deleted: true };
  }

  /** Attach library sources by pointer; already-attached ids are ignored. */
  async attach(userId: string, id: string, dto: AttachSourcesDto) {
    const { workspace, teacherId } = await this.requireOwned(userId, id);

    const owned = await this.prisma.sourceDocument.findMany({
      where: { id: { in: dto.sourceIds }, teacherId },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((source) => source.id));
    const missing = dto.sourceIds.filter((sourceId) => !ownedIds.has(sourceId));
    if (missing.length > 0) {
      throw new BadRequestException('One or more sources are not in your library');
    }

    const result = await this.prisma.workspaceSource.createMany({
      data: dto.sourceIds.map((sourceId) => ({ workspaceId: workspace.id, sourceId })),
      skipDuplicates: true,
    });
    await this.touch(workspace.id);
    return { attached: result.count };
  }

  /** Detach a pointer; the source stays in the library. */
  async detach(userId: string, id: string, sourceId: string) {
    const { workspace } = await this.requireOwned(userId, id);
    await this.prisma.workspaceSource.deleteMany({
      where: { workspaceId: workspace.id, sourceId },
    });
    await this.touch(workspace.id);
    return { detached: true };
  }

  /**
   * Ask the workspace's sources. Persists both turns, replays the recent
   * history into the model and reuses the canonical source-grounded ask
   * (same prompt, same citation verification) scoped to this workspace.
   */
  async ask(userId: string, id: string, question: string) {
    const { workspace } = await this.requireOwned(userId, id);
    const thread = await this.ensureThread(workspace.id, workspace.ownerId);

    const recent = await this.prisma.chatMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_TURNS,
    });
    const history = recent
      .reverse()
      // Empty assistant turns from an earlier provider hiccup are noise; the
      // model tends to mirror them.
      .filter((message) => message.content.trim().length > 0)
      .map((message) => ({
        role: message.role === 'USER' ? ('user' as const) : ('assistant' as const),
        content: message.content,
      }));

    const userMessage = await this.prisma.chatMessage.create({
      data: { threadId: thread.id, role: 'USER', content: question },
    });

    const result = await this.sources.askNotebook(
      userId,
      question,
      workspace.classId ?? undefined,
      workspace.subjectId ?? undefined,
      history,
      workspace.id,
    );

    const message = await this.prisma.chatMessage.create({
      data: {
        threadId: thread.id,
        role: 'ASSISTANT',
        content: result.answer,
        ...(result.citations.length > 0
          ? { citations: result.citations as unknown as Prisma.InputJsonValue }
          : {}),
      },
    });

    await this.touch(workspace.id);
    return { userMessage, message, citations: result.citations };
  }

  /** Clear the conversation but keep the workspace and its sources. */
  async clear(userId: string, id: string) {
    const { workspace } = await this.requireOwned(userId, id);
    const thread = await this.prisma.chatThread.findUnique({
      where: { workspaceId: workspace.id },
      select: { id: true },
    });
    if (thread) {
      await this.prisma.chatMessage.deleteMany({ where: { threadId: thread.id } });
    }
    await this.touch(workspace.id);
    return { cleared: true };
  }

  private async requireOwned(userId: string, id: string) {
    const teacherId = await resolveTeacherId(this.prisma, userId);
    const workspace = await this.prisma.workspace.findFirst({ where: { id, ownerId: teacherId } });
    if (!workspace) throw new NotFoundException('Workspace not found');
    return { teacherId, workspace };
  }

  private async touch(workspaceId: string): Promise<void> {
    await this.prisma.workspace.update({ where: { id: workspaceId }, data: { updatedAt: new Date() } });
  }

  /** The workspace's single conversation, created on first use (race-safe). */
  private async ensureThread(workspaceId: string, ownerId: string) {
    const existing = await this.prisma.chatThread.findUnique({ where: { workspaceId } });
    if (existing) return existing;
    try {
      return await this.prisma.chatThread.create({ data: { workspaceId, ownerId } });
    } catch (err) {
      // A concurrent first message won the unique index; reuse its row.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const raced = await this.prisma.chatThread.findUnique({ where: { workspaceId } });
        if (raced) return raced;
      }
      throw err;
    }
  }

  /**
   * First call for a teacher: create "My workspace" with their existing
   * sources attached. The deterministic id makes concurrent first calls
   * race-safe — the second upsert is a no-op, not a duplicate workspace.
   */
  private async ensureDefault(teacherId: string): Promise<void> {
    const id = `workspace-default-${teacherId}`;
    const existing = await this.prisma.workspace.findUnique({ where: { id }, select: { id: true } });
    if (existing) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.workspace.upsert({
        where: { id },
        create: { id, ownerId: teacherId, title: DEFAULT_TITLE },
        update: {},
      });
      const sources = await tx.sourceDocument.findMany({ where: { teacherId }, select: { id: true } });
      if (sources.length > 0) {
        await tx.workspaceSource.createMany({
          data: sources.map((source) => ({ workspaceId: id, sourceId: source.id })),
          skipDuplicates: true,
        });
      }
    });
  }
}
