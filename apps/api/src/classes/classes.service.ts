// src/classes/classes.service.ts — all Prisma access for the academic
// structure (classes, sections, subjects, teacher assignments).
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AssignTeacherDto, CreateClassDto, CreateSectionDto, CreateSubjectDto } from './dto';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: DatabaseService) {}

  /** Full tree: classes → sections, subjects (with teacher), student counts. */
  async findAll() {
    const classes = await this.prisma.class.findMany({
      include: {
        sections: { orderBy: { name: 'asc' } },
        subjects: {
          include: {
            subject: true,
            section: true,
            teacher: { include: { user: { select: { fullName: true } } } },
          },
        },
        _count: { select: { students: true } },
      },
      orderBy: { name: 'asc' },
    });

    // School-wide subjects (classId null) shown alongside each class's subjects.
    const schoolSubjects = await this.prisma.subject.findMany({ orderBy: { name: 'asc' } });

    return { classes, schoolSubjects };
  }

  async findOne(id: string) {
    const cls = await this.prisma.class.findUnique({
      where: { id },
      include: {
        sections: {
          include: { _count: { select: { students: true } } },
          orderBy: { name: 'asc' },
        },
        subjects: {
          include: {
            subject: true,
            section: true,
            teacher: { include: { user: { select: { fullName: true } } } },
          },
        },
        students: {
          where: { status: 'ACTIVE' },
          include: { user: { select: { fullName: true } } },
          orderBy: { rollNo: 'asc' },
        },
      },
    });
    if (!cls) throw new NotFoundException('Class not found');
    return cls;
  }

  async createClass(dto: CreateClassDto) {
    const existing = await this.prisma.class.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException(`Class "${dto.name}" already exists`);
    return this.prisma.class.create({ data: { name: dto.name } });
  }

  async removeClass(id: string) {
    const students = await this.prisma.student.count({ where: { classId: id } });
    if (students > 0) {
      throw new ConflictException('Cannot delete a class that still has students');
    }
    await this.prisma.class.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('Class not found');
    });
    return { deleted: true };
  }

  async createSection(classId: string, dto: CreateSectionDto) {
    await this.requireClass(classId);
    const existing = await this.prisma.section.findUnique({
      where: { classId_name: { classId, name: dto.name } },
    });
    if (existing) throw new ConflictException(`Section "${dto.name}" already exists in this class`);
    return this.prisma.section.create({ data: { name: dto.name, classId } });
  }

  async removeSection(id: string) {
    const students = await this.prisma.student.count({ where: { sectionId: id } });
    if (students > 0) {
      throw new ConflictException('Cannot delete a section that still has students');
    }
    await this.prisma.section.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('Section not found');
    });
    return { deleted: true };
  }

  async createSubject(dto: CreateSubjectDto) {
    const existing = await this.prisma.subject.findFirst({
      where: { OR: [{ name: dto.name }, { code: dto.code }] },
    });
    if (existing) throw new ConflictException('Subject name or code already exists');
    return this.prisma.subject.create({ data: { name: dto.name, code: dto.code } });
  }

  async removeSubject(id: string) {
    const marks = await this.prisma.examMark.count({ where: { subjectId: id } });
    if (marks > 0) {
      throw new ConflictException('Cannot delete a subject that has exam marks recorded');
    }
    await this.prisma.subject.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('Subject not found');
    });
    return { deleted: true };
  }

  /** Attach a subject to a class SECTION (creates the ClassSubject link). */
  async attachSubject(classId: string, sectionId: string, subjectId: string) {
    await this.requireClass(classId);
    const section = await this.prisma.section.findUnique({ where: { id: sectionId } });
    if (!section || section.classId !== classId) throw new NotFoundException('Section not found in this class');
    const subject = await this.prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) throw new NotFoundException('Subject not found');
    return this.prisma.classSubject.upsert({
      where: { classId_sectionId_subjectId: { classId, sectionId, subjectId } },
      create: { classId, sectionId, subjectId },
      update: {},
      include: { section: true, subject: true },
    });
  }

  /** Assign (or unassign, with empty teacherId) a teacher to a class-subject. */
  async assignTeacher(classSubjectId: string, dto: AssignTeacherDto) {
    const cs = await this.prisma.classSubject.findUnique({ where: { id: classSubjectId } });
    if (!cs) throw new NotFoundException('Class-subject not found');

    if (!dto.teacherId) {
      return this.prisma.classSubject.update({
        where: { id: classSubjectId },
        data: { teacherId: null },
      });
    }

    const teacher = await this.prisma.teacher.findUnique({ where: { id: dto.teacherId } });
    if (!teacher) throw new NotFoundException('Teacher not found');
    return this.prisma.classSubject.update({
      where: { id: classSubjectId },
      data: { teacherId: dto.teacherId },
      include: { teacher: { include: { user: { select: { fullName: true } } } } },
    });
  }

  private async requireClass(id: string) {
    const cls = await this.prisma.class.findUnique({ where: { id } });
    if (!cls) throw new NotFoundException('Class not found');
    return cls;
  }
}
