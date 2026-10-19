// src/common/access/student-access.service.spec.ts — protects the
// student-data access rule.
//
// A student record holds PII (guardian NID, address), financial data
// (invoices, payments) and academic data (transcript). Every endpoint that
// takes a studentId must ask this service first: a parent may only read
// their own children, a student only themselves, a teacher only students in
// a class they teach.
import { ForbiddenException } from '@nestjs/common';
import { StudentAccessService } from './student-access.service';

const MY_CHILD = 'child-mine';
const OTHER_CHILD = 'child-other';
const MY_STUDENT = 'student-mine';

interface FakeState {
    students: { id: string; userId: string; parentUserId: string | null; classId: string }[];
    teacher: { id: string } | null;
    /** classId per teacher id, i.e. the classes each teacher is assigned to. */
    teacherClasses: Record<string, string[]>;
}

function serviceWith(state: FakeState): StudentAccessService {
    const prisma = {
        student: {
            findUnique: async ({ where }: { where: { id: string } }) =>
                state.students.find((s) => s.id === where.id) ?? null,
            findFirst: async ({ where }: { where: { id: string; parent: { userId: string } } }) =>
                state.students.find((s) => s.id === where.id && s.parentUserId === where.parent.userId) ?? null,
        },
        teacher: {
            findUnique: async () => state.teacher,
        },
        classSubject: {
            findMany: async ({ where }: { where: { teacherId: string; class: { students: { some: { id: string } } } } }) => {
                const classes = state.teacherClasses[where.teacherId] ?? [];
                const target = state.students.find((s) => s.id === where.class.students.some.id);
                return target && classes.includes(target.classId) ? [{ id: 'cs-1' }] : [];
            },
        },
    };

    return new StudentAccessService(prisma as never);
}

function baseState(overrides: Partial<FakeState> = {}): FakeState {
    return {
        students: [
            { id: MY_CHILD, userId: 'user-student-1', parentUserId: 'user-parent-1', classId: 'class-1' },
            { id: OTHER_CHILD, userId: 'user-student-2', parentUserId: 'user-parent-2', classId: 'class-1' },
            { id: MY_STUDENT, userId: 'user-student-1', parentUserId: 'user-parent-1', classId: 'class-2' },
        ],
        teacher: { id: 'teacher-1' },
        teacherClasses: { 'teacher-1': ['class-1'] },
        ...overrides,
    };
}

describe('StudentAccessService — ADMIN', () => {
    it('allows any student', async () => {
        const service = serviceWith(baseState());
        await expect(
            service.assertCanViewStudent(OTHER_CHILD, { userId: 'u-admin', role: 'ADMIN' }),
        ).resolves.toBeUndefined();
    });
});

describe('StudentAccessService — STUDENT', () => {
    it('allows reading their own record', async () => {
        const service = serviceWith(baseState());
        await expect(
            service.assertCanViewStudent(MY_STUDENT, { userId: 'user-student-1', role: 'STUDENT' }),
        ).resolves.toBeUndefined();
    });

    it('refuses another student', async () => {
        const service = serviceWith(baseState());
        await expect(
            service.assertCanViewStudent(OTHER_CHILD, { userId: 'user-student-1', role: 'STUDENT' }),
        ).rejects.toThrow(ForbiddenException);
    });
});

describe('StudentAccessService — PARENT', () => {
    it('allows reading their own child', async () => {
        const service = serviceWith(baseState());
        await expect(
            service.assertCanViewStudent(MY_CHILD, { userId: 'user-parent-1', role: 'PARENT' }),
        ).resolves.toBeUndefined();
    });

    it("refuses another family's child", async () => {
        const service = serviceWith(baseState());
        await expect(
            service.assertCanViewStudent(OTHER_CHILD, { userId: 'user-parent-1', role: 'PARENT' }),
        ).rejects.toThrow(ForbiddenException);
    });
});

describe('StudentAccessService — TEACHER', () => {
    it('allows a student in a class they teach', async () => {
        const service = serviceWith(baseState());
        await expect(
            service.assertCanViewStudent(MY_CHILD, { userId: 'user-teacher-1', role: 'TEACHER' }),
        ).resolves.toBeUndefined();
    });

    it('refuses a student in a class they do not teach', async () => {
        const service = serviceWith(baseState());
        await expect(
            service.assertCanViewStudent(MY_STUDENT, { userId: 'user-teacher-1', role: 'TEACHER' }),
        ).rejects.toThrow(ForbiddenException);
    });

    it('refuses when the user has no teacher profile', async () => {
        const service = serviceWith(baseState({ teacher: null }));
        await expect(
            service.assertCanViewStudent(MY_CHILD, { userId: 'user-teacher-1', role: 'TEACHER' }),
        ).rejects.toThrow(ForbiddenException);
    });
});
