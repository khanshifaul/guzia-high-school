// src/teacher-dashboard/teacher-dashboard.service.spec.ts — protects the
// dashboard's "today" logic: a section counts as marked only once one of its
// students has an attendance row for today, an assignment is listed only
// while it still has unscored submissions, and plan progress is DONE/total.
import { NotFoundException } from '@nestjs/common';
import { TeacherDashboardService } from './teacher-dashboard.service';

const TEACHER_USER_ID = 'teacher-user-1';
const TEACHER_ID = 'teacher-1';

interface FakeState {
    teacher: { id: string } | null;
    classSubjects: { sectionId: string; section: DashboardSectionRow }[];
    attendance: { studentId: string; sectionId: string }[];
    assignments: {
        id: string;
        title: string;
        dueDate: Date;
        class: { name: string };
        subject: { name: string };
        submissions: { grade: number | null }[];
    }[];
    plans: { id: string; title: string; class: { name: string }; subject: { name: string }; weeks: unknown }[];
}

interface DashboardSectionRow {
    id: string;
    name: string;
    classId: string;
    class: { id: string; name: string };
    _count: { students: number };
}

function serviceWith(state: FakeState): TeacherDashboardService {
    const prisma = {
        teacher: {
            findUnique: async () => state.teacher,
        },
        classSubject: {
            findMany: async () => state.classSubjects,
        },
        attendanceRecord: {
            findMany: async () => state.attendance.map((a) => ({ student: { sectionId: a.sectionId } })),
        },
        assignment: {
            findMany: async () => state.assignments,
        },
        teachingPlan: {
            findMany: async () => state.plans,
        },
    };

    return new TeacherDashboardService(prisma as never);
}

function baseState(overrides: Partial<FakeState> = {}): FakeState {
    return {
        teacher: { id: TEACHER_ID },
        classSubjects: [
            {
                sectionId: 'section-a',
                section: {
                    id: 'section-a',
                    name: 'A',
                    classId: 'class-1',
                    class: { id: 'class-1', name: 'Class 8' },
                    _count: { students: 16 },
                },
            },
            {
                sectionId: 'section-b',
                section: {
                    id: 'section-b',
                    name: 'B',
                    classId: 'class-1',
                    class: { id: 'class-1', name: 'Class 8' },
                    _count: { students: 14 },
                },
            },
        ],
        attendance: [{ studentId: 's1', sectionId: 'section-a' }],
        assignments: [
            {
                id: 'a1',
                title: 'Maths Assignment',
                dueDate: new Date('2026-10-11'),
                class: { name: 'Class 8' },
                subject: { name: 'Mathematics' },
                submissions: [{ grade: 80 }, { grade: null }, { grade: null }],
            },
            {
                id: 'a2',
                title: 'Fully graded',
                dueDate: new Date('2026-10-12'),
                class: { name: 'Class 8' },
                subject: { name: 'Science' },
                submissions: [{ grade: 90 }, { grade: 75 }],
            },
        ],
        plans: [
            {
                id: 'p1',
                title: 'Term plan',
                class: { name: 'Class 8' },
                subject: { name: 'Mathematics' },
                weeks: [
                    { week: 1, status: 'DONE' },
                    { week: 2, status: 'DONE' },
                    { week: 3, status: 'PLANNED' },
                    { week: 4, status: 'PLANNED' },
                ],
            },
        ],
        ...overrides,
    };
}

describe('TeacherDashboardService.summary', () => {
    it('rejects a user with no teacher profile', async () => {
        const service = serviceWith(baseState({ teacher: null }));
        await expect(service.summary(TEACHER_USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('lists the sections the teacher teaches', async () => {
        const service = serviceWith(baseState());
        const result = await service.summary(TEACHER_USER_ID);
        expect(result.sections).toHaveLength(2);
        expect(result.sections.map((s) => s.name).sort()).toEqual(['A', 'B']);
    });

    it('flags a section with no attendance row for today as pending', async () => {
        const service = serviceWith(baseState());
        const result = await service.summary(TEACHER_USER_ID);
        const a = result.sections.find((s) => s.id === 'section-a');
        const b = result.sections.find((s) => s.id === 'section-b');
        expect(a?.attendancePending).toBe(false);
        expect(b?.attendancePending).toBe(true);
    });

    it('lists only the assignments that still have unscored submissions', async () => {
        const service = serviceWith(baseState());
        const result = await service.summary(TEACHER_USER_ID);
        expect(result.assignmentsAwaitingGrading).toHaveLength(1);
        expect(result.assignmentsAwaitingGrading[0].id).toBe('a1');
        expect(result.assignmentsAwaitingGrading[0].awaitingGradingCount).toBe(2);
        expect(result.assignmentsAwaitingGrading[0].submittedCount).toBe(3);
    });

    it('reports plan progress as DONE over total', async () => {
        const service = serviceWith(baseState());
        const result = await service.summary(TEACHER_USER_ID);
        expect(result.plans[0].doneWeeks).toBe(2);
        expect(result.plans[0].totalWeeks).toBe(4);
        expect(result.plans[0].pct).toBe(50);
    });

    it('returns empty lists rather than failing when the teacher has no data', async () => {
        const service = serviceWith(
            baseState({ classSubjects: [], assignments: [], plans: [], attendance: [] }),
        );
        const result = await service.summary(TEACHER_USER_ID);
        expect(result.sections).toEqual([]);
        expect(result.assignmentsAwaitingGrading).toEqual([]);
        expect(result.plans).toEqual([]);
    });
});
