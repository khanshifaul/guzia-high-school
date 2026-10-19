// src/assignments/assignments.service.spec.ts — protects the ownership rule:
// a teacher may only read, grade and delete their OWN assignments, and a
// student may only read and submit to their OWN class's assignments.
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AssignmentsService } from './assignments.service';

const TEACHER1_USER = 'teacher1-user';
const TEACHER2_USER = 'teacher2-user';
const TEACHER1_ROW = 'teacher1-row';
const TEACHER2_ROW = 'teacher2-row';
const CLASS_8 = 'class-8';

interface FakeState {
  teacherRows: { id: string; userId: string }[];
  students: { id: string; userId: string; classId: string }[];
  assignments: {
    id: string;
    classId: string;
    teacherId: string;
    title: string;
    dueDate: Date;
    submissions: { id: string; studentId: string; grade: number | null }[];
  }[];
  classSubjects: { classId: string; teacherId: string }[];
  subjects: { id: string }[];
  classes: { id: string }[];
  submissionRows: {
    id: string;
    assignmentId: string;
    studentId: string;
    content: string;
    status: string;
    grade: number | null;
    feedback: string | null;
    createdAt: Date;
  }[];
}

function baseState(overrides: Partial<FakeState> = {}): FakeState {
  return {
    teacherRows: [
      { id: TEACHER1_ROW, userId: TEACHER1_USER },
      { id: TEACHER2_ROW, userId: TEACHER2_USER },
    ],
    students: [{ id: 'student-1', userId: 'student1-user', classId: CLASS_8 }],
    assignments: [
      {
        id: 'a1',
        classId: CLASS_8,
        teacherId: TEACHER1_ROW,
        title: 'Teacher one work',
        dueDate: new Date('2026-11-01'),
        submissions: [
          { id: 's1', studentId: 'student-1', grade: null },
          { id: 's2', studentId: 'student-2', grade: 90 },
        ],
      },
      {
        id: 'a2',
        classId: CLASS_8,
        teacherId: TEACHER2_ROW,
        title: 'Teacher two work',
        dueDate: new Date('2026-11-01'),
        submissions: [],
      },
    ],
    classSubjects: [
      { classId: CLASS_8, teacherId: TEACHER1_ROW },
      { classId: CLASS_8, teacherId: TEACHER2_ROW },
    ],
    subjects: [{ id: 'subj-1' }],
    submissionRows: [
      {
        id: 's1',
        assignmentId: 'a1',
        studentId: 'student-1',
        content: 'work',
        status: 'ON_TIME',
        grade: null,
        feedback: null,
        createdAt: new Date('2026-10-20'),
      },
    ],
    classes: [{ id: CLASS_8 }],
    ...overrides,
  };
}

function serviceWith(state: FakeState): AssignmentsService {
  const prisma = {
    teacher: {
      findUnique: async ({ where }: { where: { userId: string } }) =>
        state.teacherRows.find((t) => t.userId === where.userId) ?? null,
    },
    student: {
      findUnique: async ({ where }: { where: { userId: string } }) =>
        state.students.find((s) => s.userId === where.userId) ?? null,
    },
    subject: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        state.subjects.find((s) => s.id === where.id) ?? null,
    },
    class: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        state.classes.find((c) => c.id === where.id) ?? null,
    },
    classSubject: {
      findFirst: async ({ where }: { where: { teacherId: string; classId: string } }) =>
        state.classSubjects.find(
          (cs) => cs.teacherId === where.teacherId && cs.classId === where.classId,
        ) ?? null,
    },
    assignment: {
      findMany: async ({ where }: { where: { classId: string; teacherId?: string } }) =>
        state.assignments.filter(
          (a) =>
            a.classId === where.classId &&
            (where.teacherId === undefined || a.teacherId === where.teacherId),
        ),
      findUnique: async ({ where }: { where: { id: string } }) =>
        state.assignments.find((a) => a.id === where.id) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'a-new',
        ...data,
      }),
      delete: async ({ where }: { where: { id: string } }) => {
        const idx = state.assignments.findIndex((a) => a.id === where.id);
        if (idx >= 0) state.assignments.splice(idx, 1);
        return { id: where.id };
      },
    },
    submission: {
      findUnique: async ({
        where,
      }: {
        where: {
          id?: string;
          assignmentId_studentId?: { assignmentId: string; studentId: string };
        };
      }) => {
        if (where.id !== undefined) {
          const row = state.submissionRows.find((s) => s.id === where.id);
          if (!row) return null;
          const assignment = state.assignments.find((a) => a.id === row.assignmentId);
          return { ...row, assignment };
        }
        const key = where.assignmentId_studentId!;
        return (
          state.submissionRows.find(
            (s) => s.assignmentId === key.assignmentId && s.studentId === key.studentId,
          ) ?? null
        );
      },
      create: async ({ data }: { data: Record<string, unknown> }) => ({
        id: 's-new',
        ...data,
      }),
      findFirst: async ({ where }: { where: { id: string } }) =>
        state.submissionRows.find((s) => s.id === where.id) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({
        id: where.id,
        ...data,
      }),
    },
  };

  return new AssignmentsService(prisma as never);
}

describe('AssignmentsService', () => {
  describe('create', () => {
    it('stores the Teacher row id, not the User id', async () => {
      const service = serviceWith(baseState());
      const created = await service.create(
        {
          title: 'Algebra',
          description: undefined,
          subjectId: 'subj-1',
          classId: CLASS_8,
          dueDate: '2026-11-01',
        },
        TEACHER1_USER,
      );
      expect(created.teacherId).toBe(TEACHER1_ROW);
    });

    it('refuses a class the teacher is not assigned to teach', async () => {
      const service = serviceWith(
        baseState({ classSubjects: [{ classId: CLASS_8, teacherId: TEACHER2_ROW }] }),
      );
      await expect(
        service.create(
          {
            title: 'Algebra',
            description: undefined,
            subjectId: 'subj-1',
            classId: CLASS_8,
            dueDate: '2026-11-01',
          },
          TEACHER1_USER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects an unknown subject', async () => {
      const service = serviceWith(baseState({ subjects: [] }));
      await expect(
        service.create(
          {
            title: 'Algebra',
            description: undefined,
            subjectId: 'nope',
            classId: CLASS_8,
            dueDate: '2026-11-01',
          },
          TEACHER1_USER,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('forClass', () => {
    it('gives a teacher only their own assignments', async () => {
      const service = serviceWith(baseState());
      const result = await service.forClass(CLASS_8, {
        userId: TEACHER1_USER,
        role: 'TEACHER',
      });
      expect(result.map((a) => a.id)).toEqual(['a1']);
    });

    it('refuses a student another class', async () => {
      const service = serviceWith(baseState());
      await expect(
        service.forClass('other-class', { userId: 'student1-user', role: 'STUDENT' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('gives a student their own class', async () => {
      const service = serviceWith(baseState());
      const result = await service.forClass(CLASS_8, {
        userId: 'student1-user',
        role: 'STUDENT',
      });
      expect(result).toHaveLength(2);
    });

    it('gives an admin every assignment in the class', async () => {
      const service = serviceWith(baseState());
      const result = await service.forClass(CLASS_8, {
        userId: 'admin-user',
        role: 'ADMIN',
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('submissions', () => {
    it('refuses another teacher', async () => {
      const service = serviceWith(baseState());
      await expect(
        service.submissions('a1', { userId: TEACHER2_USER, role: 'TEACHER' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows the owning teacher', async () => {
      const service = serviceWith(baseState());
      const result = await service.submissions('a1', {
        userId: TEACHER1_USER,
        role: 'TEACHER',
      });
      expect(result.id).toBe('a1');
    });
  });

  describe('grade', () => {
    it('refuses another teacher', async () => {
      const service = serviceWith(baseState());
      await expect(
        service.grade('s1', { grade: 50, feedback: undefined }, {
          userId: TEACHER2_USER,
          role: 'TEACHER',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lets the owning teacher grade', async () => {
      const service = serviceWith(baseState());
      const graded = await service.grade(
        's1',
        { grade: 75, feedback: 'Nice' },
        { userId: TEACHER1_USER, role: 'TEACHER' },
      );
      expect(graded.grade).toBe(75);
      expect(graded.feedback).toBe('Nice');
    });

    it('lets an admin grade any submission', async () => {
      const service = serviceWith(baseState());
      const graded = await service.grade(
        's1',
        { grade: 60, feedback: undefined },
        { userId: 'admin-user', role: 'ADMIN' },
      );
      expect(graded.grade).toBe(60);
    });
  });

  describe('remove', () => {
    it('refuses to delete another teacher\'s assignment', async () => {
      const state = baseState();
      const service = serviceWith(state);
      await expect(
        service.remove('a1', { userId: TEACHER2_USER, role: 'TEACHER' }),
      ).rejects.toThrow(ForbiddenException);
      expect(state.assignments.find((a) => a.id === 'a1')).toBeDefined();
    });

    it('deletes the teacher\'s own assignment', async () => {
      const state = baseState();
      const service = serviceWith(state);
      await service.remove('a1', { userId: TEACHER1_USER, role: 'TEACHER' });
      expect(state.assignments.find((a) => a.id === 'a1')).toBeUndefined();
    });
  });

  describe('submit', () => {
    it('refuses an assignment from another class', async () => {
      const state = baseState({
        students: [{ id: 'student-1', userId: 'student1-user', classId: 'class-9' }],
      });
      const service = serviceWith(state);
      await expect(
        service.submit('a1', 'student1-user', { content: 'work' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('refuses a resubmission', async () => {
      const state = baseState({
        submissionRows: [
          {
            id: 's1',
            assignmentId: 'a1',
            studentId: 'student-1',
            content: 'work',
            status: 'ON_TIME',
            grade: null,
            feedback: null,
            createdAt: new Date(),
          },
        ],
      });
      const service = serviceWith(state);
      await expect(
        service.submit('a1', 'student1-user', { content: 'work again' }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
