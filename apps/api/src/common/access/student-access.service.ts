// src/common/access/student-access.service.ts — one place that answers
// "may this viewer read this student's data?".
//
// Several endpoints take a studentId in the path (grades, fees, attendance,
// student detail). A role check alone is not enough: a PARENT may only read
// their own children, a STUDENT only themselves, and a TEACHER only students
// in a class they are assigned to teach. Every such endpoint calls
// `assertCanViewStudent` so the rule cannot drift between modules.
import { ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export interface StudentAccessViewer {
  userId: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';
}

@Injectable()
export class StudentAccessService {
  constructor(private readonly prisma: DatabaseService) {}

  /**
   * Throw ForbiddenException unless the viewer may read this student.
   *
   * The decision is by relationship, never by trusting the id in the URL.
   */
  async assertCanViewStudent(studentId: string, viewer: StudentAccessViewer): Promise<void> {
    if (viewer.role === 'ADMIN') return;

    if (viewer.role === 'STUDENT') {
      const self = await this.prisma.student.findUnique({
        where: { id: studentId },
        select: { userId: true },
      });
      if (!self || self.userId !== viewer.userId) {
        throw new ForbiddenException('Not allowed to view this student');
      }
      return;
    }

    if (viewer.role === 'PARENT') {
      const child = await this.prisma.student.findFirst({
        where: { id: studentId, parent: { userId: viewer.userId } },
        select: { id: true },
      });
      if (!child) throw new ForbiddenException('Not allowed to view this student');
      return;
    }

    if (viewer.role === 'TEACHER') {
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId: viewer.userId },
        select: { id: true },
      });
      if (!teacher) throw new ForbiddenException('Not allowed to view this student');
      // A teacher may read a student of a class they are assigned to teach.
      const taught = await this.prisma.classSubject.findMany({
        where: { teacherId: teacher.id, class: { students: { some: { id: studentId } } } },
        select: { id: true },
      });
      if (taught.length === 0) {
        throw new ForbiddenException('Not allowed to view this student');
      }
      return;
    }

    throw new ForbiddenException('Not allowed to view this student');
  }
}
