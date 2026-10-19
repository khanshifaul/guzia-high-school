// src/common/access/teacher-access.util.ts — resolve the caller's Teacher row.
//
// A session user id is not a teacher id: every teacher-scoped service needs
// the same lookup, so it lives here once and the 404 message cannot drift.
import { NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

/** The caller's Teacher id, or a 404 when the account has no teacher profile. */
export async function resolveTeacherId(
    prisma: DatabaseService,
    userId: string,
): Promise<string> {
    const teacher = await prisma.teacher.findUnique({ where: { userId } });
    if (!teacher) throw new NotFoundException('No teacher profile for this user');
    return teacher.id;
}
