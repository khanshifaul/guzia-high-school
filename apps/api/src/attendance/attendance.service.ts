// src/attendance/attendance.service.ts — mark + query attendance. Marking is
// an idempotent upsert per [studentId, date] (specs/06 lesson from School-management).
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { MarkAttendanceDto } from './dto';
import { weightedAttendancePct } from './attendance.util';

@Injectable()
export class AttendanceService {
    constructor(private readonly prisma: DatabaseService) {}

    /** Mark a whole section for one date. Upserts per [studentId, date]. */
    async mark(dto: MarkAttendanceDto, markedById: string) {
        // Normalize to UTC midnight (dates are calendar days, not instants).
        const date = new Date(`${dto.date}T00:00:00.000Z`);

        // Every student must belong to the section (guard against spoofing).
        const section = await this.prisma.section.findUnique({
            where: { id: dto.sectionId },
            include: { students: { select: { id: true } } },
        });
        if (!section) throw new NotFoundException('Section not found');
        const validIds = new Set(section.students.map((s) => s.id));
        const invalid = dto.records.filter((r) => !validIds.has(r.studentId));
        if (invalid.length > 0) {
            throw new BadRequestException(
                `${invalid.length} student(s) are not in this section`,
            );
        }

        await this.prisma.$transaction(
            dto.records.map((r) =>
                this.prisma.attendanceRecord.upsert({
                    where: { studentId_date: { studentId: r.studentId, date } },
                    create: {
                        studentId: r.studentId,
                        date,
                        status: r.status,
                        markedById,
                    },
                    update: { status: r.status, markedById },
                }),
            ),
        );

        return { marked: dto.records.length, date: dto.date };
    }

    /** Section roster with each student's status for a given date. */
    async forSectionDate(sectionId: string, dateStr: string) {
        const date = new Date(`${dateStr}T00:00:00.000Z`);
        const section = await this.prisma.section.findUnique({
            where: { id: sectionId },
            include: {
                students: {
                    where: { status: 'ACTIVE' },
                    orderBy: { rollNo: 'asc' },
                    include: {
                        attendance: { where: { date } },
                    },
                },
            },
        });
        if (!section) throw new NotFoundException('Section not found');

        return {
            sectionId,
            date: dateStr,
            records: section.students.map((s) => ({
                studentId: s.id,
                rollNo: s.rollNo,
                fullName: s.fullName,
                status: s.attendance[0]?.status ?? null,
            })),
        };
    }

    /** A student's attendance history + weighted percentage. */
    async forStudent(studentId: string, opts: { from?: string; to?: string } = {}) {
        const where: { studentId: string; date?: { gte?: Date; lte?: Date } } = { studentId };
        if (opts.from || opts.to) {
            where.date = {
                ...(opts.from ? { gte: new Date(`${opts.from}T00:00:00.000Z`) } : {}),
                ...(opts.to ? { lte: new Date(`${opts.to}T00:00:00.000Z`) } : {}),
            };
        }
        const records = await this.prisma.attendanceRecord.findMany({
            where,
            orderBy: { date: 'desc' },
        });
        return {
            records,
            attendancePct: weightedAttendancePct(records),
            total: records.length,
        };
    }
}
