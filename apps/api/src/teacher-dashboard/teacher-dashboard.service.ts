// src/teacher-dashboard/teacher-dashboard.service.ts — the teacher's "today"
// view: the classes they teach, the sections still unmarked for attendance,
// the assignments still waiting to be graded, and the plan progress the
// specs ask to surface ("Math 8 syllabus 42%").

import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { PlanWeek } from '../ai/plans/plans.service';

/** A section of a class the teacher is assigned to, with its roster size. */
export interface DashboardSection {
    id: string;
    name: string;
    classId: string;
    className: string;
    studentCount: number;
    /** True when no attendance row exists for today. */
    attendancePending: boolean;
}

/** An assignment with work submitted but not yet scored. */
export interface DashboardAssignment {
    id: string;
    title: string;
    className: string;
    subjectName: string;
    dueDate: string;
    submittedCount: number;
    /** Submitted but still ungraded. */
    awaitingGradingCount: number;
}

/** A lesson plan the teacher owns, with its week progress. */
export interface DashboardPlan {
    id: string;
    title: string;
    className: string;
    subjectName: string;
    doneWeeks: number;
    totalWeeks: number;
    pct: number;
}

export interface TeacherDashboard {
    sections: DashboardSection[];
    assignmentsAwaitingGrading: DashboardAssignment[];
    plans: DashboardPlan[];
}

@Injectable()
export class TeacherDashboardService {
    constructor(private readonly prisma: DatabaseService) {}

    /**
     * Everything the teacher dashboard shows, in one request.
     *
     * The scope is the teacher's own: the sections they are assigned to teach
     * (via ClassSubject), the assignments they created, and the plans they own.
     */
    async summary(userId: string): Promise<TeacherDashboard> {
        const teacher = await this.prisma.teacher.findUnique({ where: { userId } });
        if (!teacher) throw new NotFoundException('No teacher profile for this user');

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [sections, assignments, plans] = await Promise.all([
            this.teacherSections(teacher.id, today),
            this.assignmentsAwaitingGrading(teacher.id),
            this.teacherPlans(teacher.id),
        ]);

        return { sections, assignmentsAwaitingGrading: assignments, plans };
    }

    /** The sections this teacher teaches, flagged with today's attendance state. */
    private async teacherSections(teacherId: string, today: Date): Promise<DashboardSection[]> {
        const assignments = await this.prisma.classSubject.findMany({
            where: { teacherId },
            select: {
                section: {
                    select: {
                        id: true,
                        name: true,
                        classId: true,
                        class: { select: { id: true, name: true } },
                        _count: { select: { students: true } },
                    },
                },
            },
        });

        // The same section can appear once per subject the teacher teaches.
        const bySection = new Map<string, DashboardSection>();
        for (const a of assignments) {
            const s = a.section;
            if (bySection.has(s.id)) continue;
            bySection.set(s.id, {
                id: s.id,
                name: s.name,
                classId: s.classId,
                className: s.class.name,
                studentCount: s._count.students,
                attendancePending: true,
            });
        }

        const sections = [...bySection.values()];
        if (sections.length === 0) return sections;

        // A section is marked once at least one of its students has a row for
        // today; an empty section counts as marked.
        const marked = await this.prisma.attendanceRecord.findMany({
            where: {
                date: today,
                student: { sectionId: { in: sections.map((s) => s.id) } },
            },
            select: { student: { select: { sectionId: true } } },
            distinct: ['studentId'],
        });
        const markedSections = new Set(marked.map((m) => m.student.sectionId));
        return sections.map((s) => ({ ...s, attendancePending: !markedSections.has(s.id) }));
    }

    /** Assignments with submissions the teacher has not scored yet. */
    private async assignmentsAwaitingGrading(teacherId: string): Promise<DashboardAssignment[]> {
        const assignments = await this.prisma.assignment.findMany({
            where: { teacherId },
            include: {
                class: { select: { name: true } },
                subject: { select: { name: true } },
                submissions: { select: { status: true, grade: true } },
            },
            orderBy: { dueDate: 'asc' },
        });

        return assignments
            .map((a) => {
                // Every submission counts as submitted work; what matters is
                // whether it carries a score yet.
                const submitted = a.submissions;
                const ungraded = submitted.filter((s) => s.grade === null);
                return {
                    id: a.id,
                    title: a.title,
                    className: a.class.name,
                    subjectName: a.subject.name,
                    dueDate: a.dueDate.toISOString().slice(0, 10),
                    submittedCount: submitted.length,
                    awaitingGradingCount: ungraded.length,
                };
            })
            .filter((a) => a.awaitingGradingCount > 0);
    }

    /** The teacher's lesson plans with their week progress. */
    private async teacherPlans(teacherId: string): Promise<DashboardPlan[]> {
        const plans = await this.prisma.teachingPlan.findMany({
            where: { teacherId },
            include: { class: { select: { name: true } }, subject: { select: { name: true } } },
            orderBy: { updatedAt: 'desc' },
        });

        return plans.map((p) => {
            const weeks = (p.weeks ?? []) as unknown as PlanWeek[];
            const doneWeeks = weeks.filter((w) => w.status === 'DONE').length;
            return {
                id: p.id,
                title: p.title,
                className: p.class.name,
                subjectName: p.subject.name,
                doneWeeks,
                totalWeeks: weeks.length,
                pct: weeks.length ? Math.round((doneWeeks / weeks.length) * 100) : 0,
            };
        });
    }
}
