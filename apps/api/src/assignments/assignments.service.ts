// src/assignments/assignments.service.ts — assignments + submissions + grading.
//
// Ownership rule (specs/06 §6 "Roles & ownership"): a TEACHER may only act
// on assignments they own — that is, the Assignment.teacherId points at the
// Teacher row, and the teacher's User id is what the JWT carries. Every
// teacher-facing method resolves User -> Teacher first, so a teacher can never
// read, grade or delete another teacher's work.
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateAssignmentDto, GradeSubmissionDto, SubmitWorkDto } from './dto';

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: DatabaseService) {}

  /**
   * The assignments of one class.
   *
   * A STUDENT may only read their own class's assignments, and sees only
   * their own submission; a TEACHER only the ones they own; an ADMIN any
   * class.
   */
  async forClass(
    classId: string,
    viewer: { userId: string; role: string },
  ) {
    if (viewer.role === 'STUDENT') {
      const student = await this.prisma.student.findUnique({
        where: { userId: viewer.userId },
        select: { id: true, classId: true },
      });
      if (!student || student.classId !== classId) {
        throw new ForbiddenException('Not allowed to view this class');
      }

      const assignments = await this.prisma.assignment.findMany({
        where: { classId },
        include: {
          subject: true,
          teacher: { include: { user: { select: { fullName: true } } } },
          submissions: {
            where: { studentId: student.id },
            select: { grade: true, feedback: true, status: true },
          },
        },
        orderBy: { dueDate: 'desc' },
      });
      return assignments.map((a) => ({
        ...a,
        submissions: a.submissions.map((s) => ({ ...s })),
      }));
    }

    if (viewer.role === 'TEACHER') {
      const teacher = await this.requireTeacher(viewer.userId);
      return this.prisma.assignment.findMany({
        where: { classId, teacherId: teacher.id },
        include: {
          subject: true,
          teacher: { include: { user: { select: { fullName: true } } } },
          submissions: { select: { grade: true } },
        },
        orderBy: { dueDate: 'desc' },
      });
    }

    return this.prisma.assignment.findMany({
      where: { classId },
      include: {
        subject: true,
        teacher: { include: { user: { select: { fullName: true } } } },
        submissions: { select: { grade: true } },
      },
      orderBy: { dueDate: 'desc' },
    });
  }

  async create(
    dto: CreateAssignmentDto,
    teacherUserId: string,
  ) {
    const teacher = await this.requireTeacher(teacherUserId);
    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId },
    });
    if (!subject) throw new NotFoundException('Subject not found');
    const cls = await this.prisma.class.findUnique({
      where: { id: dto.classId },
    });
    if (!cls) throw new NotFoundException('Class not found');

    // The teacher may only assign work in a class they are assigned to teach.
    const teaches = await this.prisma.classSubject.findFirst({
      where: { teacherId: teacher.id, classId: dto.classId },
      select: { id: true },
    });
    if (!teaches) {
      throw new ForbiddenException(
        'You are not assigned to teach this class',
      );
    }

    return this.prisma.assignment.create({
      data: {
        title: dto.title,
        description: dto.description,
        subjectId: dto.subjectId,
        classId: dto.classId,
        teacherId: teacher.id,
        dueDate: new Date(dto.dueDate),
      },
    });
  }

  /** Delete an assignment. A teacher may only delete their own. */
  async remove(id: string, viewer: { userId: string; role: string }) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      select: { id: true, teacherId: true },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    if (viewer.role !== 'ADMIN') {
      const teacher = await this.requireTeacher(viewer.userId);
      if (assignment.teacherId !== teacher.id) {
        throw new ForbiddenException('You can only delete your own assignments');
      }
    }

    await this.prisma.assignment.delete({ where: { id } });
    return { deleted: true };
  }

  /** One assignment + all submissions (for the grading view). */
  async submissions(id: string, viewer: { userId: string; role: string }) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        submissions: {
          include: {
            student: { include: { user: { select: { fullName: true } } } },
          },
          orderBy: { createdAt: 'asc' },
        },
        subject: true,
      },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    if (viewer.role !== 'ADMIN') {
      const teacher = await this.requireTeacher(viewer.userId);
      if (assignment.teacherId !== teacher.id) {
        throw new ForbiddenException(
          'You can only view submissions for your own assignments',
        );
      }
    }

    return assignment;
  }

  /**
   * A student submits their work (one per assignment).
   *
   * The student is resolved from their User id, and they may only submit to
   * an assignment of their own class.
   */
  async submit(assignmentId: string, studentUserId: string, dto: SubmitWorkDto) {
    const student = await this.prisma.student.findUnique({
      where: { userId: studentUserId },
      select: { id: true, classId: true },
    });
    if (!student) {
      throw new NotFoundException('No student linked to this account');
    }

    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { id: true, classId: true, dueDate: true },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.classId !== student.classId) {
      throw new ForbiddenException('This assignment is not for your class');
    }

    const existing = await this.prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId: student.id } },
    });
    if (existing) {
      throw new ConflictException('You have already submitted this assignment');
    }

    const late = new Date() > assignment.dueDate;
    return this.prisma.submission.create({
      data: {
        assignmentId,
        studentId: student.id,
        content: dto.content,
        status: late ? 'LATE' : 'ON_TIME',
      },
    });
  }

  /** Teacher grades a submission (must own the assignment; admin may grade any). */
  async grade(
    submissionId: string,
    dto: GradeSubmissionDto,
    grader: { userId: string; role: string },
  ) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { assignment: true },
    });
    if (!submission) throw new NotFoundException('Submission not found');

    if (grader.role !== 'ADMIN') {
      const teacher = await this.requireTeacher(grader.userId);
      if (submission.assignment.teacherId !== teacher.id) {
        throw new ForbiddenException('You can only grade your own assignments');
      }
    }

    const late = submission.createdAt > submission.assignment.dueDate;
    return this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        grade: dto.grade,
        feedback: dto.feedback,
        status: late ? 'LATE_GRADED' : 'ON_TIME',
      },
    });
  }

  /** The Teacher row behind a teacher User id. */
  private async requireTeacher(userId: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!teacher) {
      throw new ForbiddenException('No teacher profile for this account');
    }
    return teacher;
  }
}
