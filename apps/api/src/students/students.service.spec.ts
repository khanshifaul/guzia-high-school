// src/students/students.service.spec.ts — protects the teacher roster scope.
//
// A teacher may only read the students of a class where they are assigned to
// teach a subject (ClassSubject → teacher → class → section). Requesting a
// class they do not teach must return an empty roster, not the whole school.
import { NotFoundException } from '@nestjs/common';
import { StudentsService } from './students.service';

const TEACHER_USER_ID = 'teacher-user-1';
const TEACHER_ID = 'teacher-1';
const MY_CLASS = 'class-mine';
const OTHER_CLASS = 'class-other';
const MY_SECTION = 'section-a';
const OTHER_SECTION = 'section-z';

interface FakeState {
    teacher: { id: string } | null;
    assignments: { classId: string; sectionId: string }[];
    students: { id: string; fullName: string; classId: string; sectionId: string }[];
    lastWhere: Record<string, unknown> | null;
}

function student(id: string, classId: string, sectionId: string) {
    return { id, fullName: `Student ${id}`, classId, sectionId };
}

function serviceWith(state: FakeState): StudentsService {
    const prisma = {
        teacher: {
            findUnique: async () => state.teacher,
        },
        classSubject: {
            findMany: async () => state.assignments,
        },
        student: {
            findMany: async ({ where }: { where: Record<string, unknown> }) => {
                state.lastWhere = where;
                // Apply the classId / sectionId filter the service asked for.
                return state.students.filter((s) => {
                    if (where.classId && where.classId !== MY_CLASS && where.classId !== OTHER_CLASS) {
                        return false;
                    }
                    if (where.classId === MY_CLASS && s.classId !== MY_CLASS) return false;
                    if (where.classId === OTHER_CLASS && s.classId !== OTHER_CLASS) return false;
                    if (where.sectionId && s.sectionId !== where.sectionId) return false;
                    return true;
                });
            },
        },
    };

    return new StudentsService(prisma as never, {} as never);
}

function baseState(overrides: Partial<FakeState> = {}): FakeState {
    return {
        teacher: { id: TEACHER_ID },
        assignments: [{ classId: MY_CLASS, sectionId: MY_SECTION }],
        students: [
            student('s1', MY_CLASS, MY_SECTION),
            student('s2', MY_CLASS, OTHER_SECTION),
            student('s3', OTHER_CLASS, MY_SECTION),
        ],
        lastWhere: null,
        ...overrides,
    };
}

describe('findAllForTeacher', () => {
    it('returns the roster of a class the teacher teaches', async () => {
        const service = serviceWith(baseState());
        const result = await service.findAllForTeacher(TEACHER_USER_ID, { classId: MY_CLASS });
        expect(result.meta.total).toBeGreaterThan(0);
        expect(result.data.every((s) => s.classId === MY_CLASS)).toBe(true);
    });

    it('returns nothing for a class the teacher does not teach', async () => {
        const service = serviceWith(baseState());
        const result = await service.findAllForTeacher(TEACHER_USER_ID, { classId: OTHER_CLASS });
        expect(result.data).toEqual([]);
        expect(result.meta.total).toBe(0);
    });

    it('never leaks another class when no class filter is given', async () => {
        const service = serviceWith(baseState());
        const result = await service.findAllForTeacher(TEACHER_USER_ID, {});
        expect(result.data.every((s) => s.classId === MY_CLASS)).toBe(true);
    });

    it('returns nothing for a section the teacher does not teach', async () => {
        const service = serviceWith(baseState());
        const result = await service.findAllForTeacher(TEACHER_USER_ID, {
            classId: MY_CLASS,
            sectionId: OTHER_SECTION,
        });
        expect(result.data).toEqual([]);
    });

    it('returns nothing when the teacher has no class assignment', async () => {
        const service = serviceWith(baseState({ assignments: [] }));
        const result = await service.findAllForTeacher(TEACHER_USER_ID, {});
        expect(result.data).toEqual([]);
        expect(result.meta.total).toBe(0);
    });

    it('rejects a user with no teacher profile', async () => {
        const service = serviceWith(baseState({ teacher: null }));
        await expect(service.findAllForTeacher(TEACHER_USER_ID, {})).rejects.toThrow(
            NotFoundException,
        );
    });

    it('scopes to the section when one is requested', async () => {
        const state = baseState();
        const service = serviceWith(state);
        const result = await service.findAllForTeacher(TEACHER_USER_ID, {
            classId: MY_CLASS,
            sectionId: MY_SECTION,
        });
        expect(result.data.every((s) => s.sectionId === MY_SECTION)).toBe(true);
    });
});
