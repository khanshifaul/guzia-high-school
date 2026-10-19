// src/students/students.service.ts — student CRUD + computed overview stats
// (attendance % via the weighted rule, CGPA via canonical grading).
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as bcrypt from 'bcryptjs';
import { gradeSubject, cgpa as computeCgpa } from '../exams/grading.util';
import { CreateStudentDto, UpdateStudentDto } from './dto';
import {
  StudentAccessService,
  type StudentAccessViewer,
} from '../common/access/student-access.service';

const STUDENT_INCLUDE = {
  user: { select: { id: true, email: true, fullName: true, status: true } },
  class: true,
  section: true,
  parent: { include: { user: { select: { fullName: true, email: true } } } },
} as const;

/** The authenticated caller, as far as student access is concerned. */
export type StudentViewer = StudentAccessViewer;

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly access: StudentAccessService,
  ) {}

  async findAll(params: { search?: string; classId?: string; sectionId?: string }) {
    const where = {
      ...(params.classId ? { classId: params.classId } : {}),
      ...(params.sectionId ? { sectionId: params.sectionId } : {}),
      ...(params.search
        ? {
            OR: [
              { fullName: { contains: params.search, mode: 'insensitive' as const } },
              { admissionNo: { contains: params.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const students = await this.prisma.student.findMany({
      where,
      include: STUDENT_INCLUDE,
      orderBy: [{ class: { name: 'asc' } }, { rollNo: 'asc' }],
    });

    return { data: students, meta: { total: students.length } };
  }

  /**
   * Students in the classes a teacher actually teaches.
   *
   * A teacher's scope comes from `ClassSubject` (teacher → class → section):
   * a teacher may only read the roster of a class where they are assigned to
   * teach a subject. ADMIN keeps the unrestricted `findAll`.
   */
  async findAllForTeacher(
    teacherUserId: string,
    params: { search?: string; classId?: string; sectionId?: string },
  ) {
    const teacher = await this.prisma.teacher.findUnique({ where: { userId: teacherUserId } });
    if (!teacher) throw new NotFoundException('No teacher profile for this user');

    // The classes/sections this teacher is assigned to. A teacher with no
    // assignment sees nothing.
    const assignments = await this.prisma.classSubject.findMany({
      where: { teacherId: teacher.id },
      select: { classId: true, sectionId: true },
    });
    const classIds = [...new Set(assignments.map((a) => a.classId))];
    if (classIds.length === 0) return { data: [], meta: { total: 0 } };

    // Narrowing to one class/section the teacher does not teach must return
    // nothing rather than silently fall back to their whole scope.
    if (params.classId && !classIds.includes(params.classId)) {
      return { data: [], meta: { total: 0 } };
    }
    if (params.sectionId) {
      const allowed = new Set(
        assignments
          .filter((a) => !params.classId || a.classId === params.classId)
          .map((a) => a.sectionId),
      );
      if (!allowed.has(params.sectionId)) return { data: [], meta: { total: 0 } };
    }

    const scope = params.sectionId
      ? { sectionId: params.sectionId }
      : { classId: { in: classIds } };

    const where = {
      ...scope,
      ...(params.classId && !params.sectionId ? { classId: params.classId } : {}),
      ...(params.search
        ? {
            OR: [
              { fullName: { contains: params.search, mode: 'insensitive' as const } },
              { admissionNo: { contains: params.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const students = await this.prisma.student.findMany({
      where,
      include: STUDENT_INCLUDE,
      orderBy: [{ class: { name: 'asc' } }, { rollNo: 'asc' }],
    });

    return { data: students, meta: { total: students.length } };
  }

  /**
   * One student with their stats and transcript.
   *
   * Access is decided server-side, never by the caller:
   *  - ADMIN: any student.
   *  - TEACHER: a student in a class the teacher teaches.
   *  - STUDENT: only themselves.
   *  - PARENT: only their own children.
   *  - anyone else: 403.
   */
  async findOne(id: string, viewer?: StudentViewer) {
    if (viewer) await this.access.assertCanViewStudent(id, viewer);
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        ...STUDENT_INCLUDE,
        attendance: { orderBy: { date: 'desc' }, take: 60 },
        invoices: { include: { feeHead: true, allocations: true }, orderBy: { dueDate: 'asc' } },
        payments: { orderBy: { paidAt: 'desc' } },
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    const bands = await this.prisma.gradeBand.findMany();
    const attendancePct = weightedAttendancePct(student.attendance);
    const transcript = await this.buildTranscript(id, bands);
    const dues = student.invoices
      .filter((inv) => inv.status !== 'PAID')
      .reduce((sum, inv) => {
        const allocated = inv.allocations.reduce((s, a) => s + a.amount, 0);
        return sum + (inv.amount - allocated);
      }, 0);

    return {
      ...student,
      stats: {
        attendancePct,
        cgpa: transcript.cgpa,
        totalDue: dues,
      },
      transcript,
    };
  }


  /** Published-exam transcript with canonical letters/points + CGPA. */
  async buildTranscript(studentId: string, bands?: { minPercent: number; maxPercent: number; letter: string; point: number }[]) {
    const gradeBands = bands ?? (await this.prisma.gradeBand.findMany());
    const exams = await this.prisma.exam.findMany({
      where: { published: true },
      include: {
        marks: { where: { studentId }, include: { subject: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    const perExam = exams
      .filter((e) => e.marks.length > 0)
      .map((exam) => {
        const subjects = exam.marks.map((m) => ({
          subject: m.subject.name,
          ...gradeSubject({ marksObtained: m.marksObtained, totalMarks: m.totalMarks }, gradeBands),
        }));
        const examGpa =
          subjects.reduce((s, subj) => s + subj.point, 0) / subjects.length;
        return {
          id: exam.id,
          name: exam.name,
          startDate: exam.startDate,
          subjects,
          gpa: Math.round(examGpa * 100) / 100,
        };
      });

    return { exams: perExam, cgpa: computeCgpa(perExam.map((e) => e.gpa)) };
  }

  async create(dto: CreateStudentDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) throw new ConflictException('A user with this email already exists');

    const cls = await this.prisma.class.findUnique({ where: { id: dto.classId } });
    if (!cls) throw new NotFoundException('Class not found');
    if (dto.sectionId) {
      const section = await this.prisma.section.findUnique({ where: { id: dto.sectionId } });
      if (!section) throw new NotFoundException('Section not found');
    }

    const rollConflict = await this.prisma.student.findFirst({
      where: { classId: dto.classId, rollNo: dto.rollNo },
    });
    if (rollConflict) throw new ConflictException(`Roll number ${dto.rollNo} already taken in ${cls.name}`);

    const count = await this.prisma.student.count();
    const admissionNo = `GHS-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        role: 'STUDENT',
      },
    });

    return this.prisma.student.create({
      data: {
        userId: user.id,
        admissionNo,
        fullName: dto.fullName,
        fullNameBn: dto.fullNameBn,
        photoUrl: dto.photoUrl,
        classId: dto.classId,
        sectionId: dto.sectionId,
        parentId: dto.parentId,
        rollNo: dto.rollNo,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        bloodGroup: dto.bloodGroup,
        religion: dto.religion,
        nationality: dto.nationality,
        birthCertNo: dto.birthCertNo,
        guardianName: dto.guardianName,
        guardianRelation: dto.guardianRelation,
        guardianPhone: dto.guardianPhone,
        guardianNid: dto.guardianNid,
        village: dto.village,
        road: dto.road,
        ward: dto.ward,
        postOffice: dto.postOffice,
        policeStation: dto.policeStation,
        upazila: dto.upazila,
        district: dto.district,
        postalCode: dto.postalCode,
        previousSchool: dto.previousSchool,
        admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : undefined,
      },
      include: STUDENT_INCLUDE,
    });
  }

  /** Bulk import: create each row, collecting per-row errors (partial OK). */
  async bulkCreate(students: CreateStudentDto[]) {
    const created: { email: string }[] = [];
    const errors: { index: number; email: string; reason: string }[] = [];

    for (const [index, dto] of students.entries()) {
      try {
        await this.create(dto);
        created.push({ email: dto.email });
      } catch (err) {
        const reason = err instanceof Error ? err.message : 'Failed to create';
        errors.push({ index, email: dto.email, reason });
      }
    }

    return { created: created.length, skipped: errors.length, errors };
  }

  async update(id: string, dto: UpdateStudentDto) {
    await this.requireStudent(id);
    const { password: _ignored, classId: _c, rollNo: _r, ...data } = dto;
    return this.prisma.student.update({
      where: { id },
      data: {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      },
      include: STUDENT_INCLUDE,
    });
  }

  /** Block (not hard-delete) a student; login is revoked with it. */
  async block(id: string) {
    const student = await this.requireStudent(id);
    await this.prisma.$transaction([
      this.prisma.student.update({ where: { id }, data: { status: 'BLOCKED' } }),
      ...(student.userId
        ? [
            this.prisma.user.update({
              where: { id: student.userId },
              data: { status: 'BLOCKED' },
            }),
          ]
        : []),
    ]);
    return { blocked: true };
  }

  private async requireStudent(id: string) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }
}

/** Weighted attendance % = (PRESENT·1 + LATE·0.5) / total · 100 (specs/06). */
export function weightedAttendancePct(
  records: { status: 'PRESENT' | 'ABSENT' | 'LATE' }[],
): number {
  if (records.length === 0) return 0;
  const weighted = records.reduce((sum, r) => {
    if (r.status === 'PRESENT') return sum + 1;
    if (r.status === 'LATE') return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((weighted / records.length) * 1000) / 10;
}
