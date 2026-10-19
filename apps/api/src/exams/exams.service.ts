// src/exams/exams.service.ts — exams + marks entry (cap-validated server-side,
// Unifiedtransform lesson) + publish + canonical report card.
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { gradeSubject, examGPA, cgpa as computeCgpa, type Band } from './grading.util';
import { CreateExamDto, SubmitMarksDto } from './dto';

/** Who is asking for an exam. Decides whether they may read its marks. */
export interface ExamViewer {
  id: string;
  role: 'ADMIN' | 'TEACHER';
}

/** The total for a subject that has no explicit ExamSubject row. */
const DEFAULT_TOTAL_MARKS = 100;

@Injectable()
export class ExamsService {
    constructor(private readonly prisma: DatabaseService) {}

    async findAll(classId?: string) {
        return this.prisma.exam.findMany({
            where: classId ? { classId } : {},
            include: {
                // The teacher marks-entry page picks the subject from the exam's
                // class, so the subject list must travel with the list response.
                class: { include: { subjects: { include: { subject: true } } } },
                // The per-subject totals the server owns, so the entry grid can
                // show the real limit instead of a hardcoded 100.
                subjects: { select: { subjectId: true, totalMarks: true } },
                _count: { select: { marks: true } },
            },
            orderBy: { startDate: 'desc' },
        });
    }

    /**
     * One exam with its marks. A teacher may only read an exam for a class
     * they are assigned to teach — otherwise the roster of every student in
     * the school is readable by any teacher.
     */
    async findOne(id: string, viewer: ExamViewer) {
        const exam = await this.prisma.exam.findUnique({
            where: { id },
            include: {
                class: { include: { subjects: { include: { subject: true } } } },
                marks: { include: { student: true, subject: true } },
            },
        });
        if (!exam) throw new NotFoundException('Exam not found');
        await this.assertCanTeachExam(exam.classId, viewer);
        return exam;
    }

    /**
     * Throw unless the viewer may read the marks of this class. An admin may
     * read anything; a teacher must be assigned to teach the class.
     */
    private async assertCanTeachExam(classId: string, viewer: ExamViewer): Promise<void> {
        if (viewer.role === 'ADMIN') return;
        const teacher = await this.prisma.teacher.findUnique({
            where: { userId: viewer.id },
            select: { id: true },
        });
        if (!teacher) throw new ForbiddenException('Not allowed to view this exam');
        const taught = await this.prisma.classSubject.findFirst({
            where: { teacherId: teacher.id, classId },
            select: { id: true },
        });
        if (!taught) throw new ForbiddenException('Not allowed to view this exam');
    }

    async create(dto: CreateExamDto) {
        const cls = await this.prisma.class.findUnique({ where: { id: dto.classId } });
        if (!cls) throw new NotFoundException('Class not found');
        const existing = await this.prisma.exam.findFirst({
            where: { name: dto.name, classId: dto.classId },
        });
        if (existing) throw new ConflictException(`Exam "${dto.name}" already exists for this class`);
        return this.prisma.exam.create({
            data: {
                name: dto.name,
                classId: dto.classId,
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
            },
        });
    }

    /**
     * Bulk upsert marks. The total is the server's: it is read from
     * ExamSubject for each (exam, subject) and never taken from the request
     * (Unifiedtransform cap-validation lesson, and a caller cannot inflate
     * the total to slip a mark past the check).
     */
    async submitMarks(examId: string, dto: SubmitMarksDto, viewer: ExamViewer) {
        const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
        if (!exam) throw new NotFoundException('Exam not found');
        await this.assertCanTeachExam(exam.classId, viewer);

        const subjectIds = [...new Set(dto.marks.map((m) => m.subjectId))];
        const totals = await this.prisma.examSubject.findMany({
            where: { examId, subjectId: { in: subjectIds } },
            select: { subjectId: true, totalMarks: true },
        });
        const totalBySubject = new Map(totals.map((t) => [t.subjectId, t.totalMarks]));

        for (const m of dto.marks) {
            const total = totalBySubject.get(m.subjectId) ?? DEFAULT_TOTAL_MARKS;
            if (m.marksObtained > total) {
                throw new BadRequestException(
                    `Marks ${m.marksObtained} exceed total ${total} for student ${m.studentId}`,
                );
            }
        }

        await this.prisma.$transaction(
            dto.marks.map((m) =>
                this.prisma.examMark.upsert({
                    where: {
                        examId_studentId_subjectId: {
                            examId,
                            studentId: m.studentId,
                            subjectId: m.subjectId,
                        },
                    },
                    create: {
                        examId,
                        studentId: m.studentId,
                        subjectId: m.subjectId,
                        marksObtained: m.marksObtained,
                        totalMarks: totalBySubject.get(m.subjectId) ?? DEFAULT_TOTAL_MARKS,
                    },
                    update: {
                        marksObtained: m.marksObtained,
                        totalMarks: totalBySubject.get(m.subjectId) ?? DEFAULT_TOTAL_MARKS,
                    },
                }),
            ),
        );

        return { saved: dto.marks.length };
    }

    async publish(id: string, published: boolean) {
        const exam = await this.prisma.exam.findUnique({ where: { id } });
        if (!exam) throw new NotFoundException('Exam not found');
        return this.prisma.exam.update({ where: { id }, data: { published } });
    }

    /** Report card for one student in one exam: per-subject letter/point + exam GPA. */
    async reportCard(examId: string, studentId: string) {
        const exam = await this.prisma.exam.findUnique({
            where: { id: examId },
            include: { marks: { where: { studentId }, include: { subject: true } } },
        });
        if (!exam) throw new NotFoundException('Exam not found');
        const bands = await this.prisma.gradeBand.findMany();
        const subjects = exam.marks.map((m) => ({
            subject: m.subject.name,
            ...gradeSubject({ marksObtained: m.marksObtained, totalMarks: m.totalMarks }, bands),
        }));
        return {
            examId,
            examName: exam.name,
            published: exam.published,
            subjects,
            gpa: examGPA(exam.marks, bands),
        };
    }

    /** Published results for a student across all exams + CGPA. */
    async resultsForStudent(studentId: string) {
        const bands = await this.prisma.gradeBand.findMany();
        const exams = await this.prisma.exam.findMany({
            where: { published: true },
            include: { marks: { where: { studentId }, include: { subject: true } } },
            orderBy: { startDate: 'asc' },
        });

        const perExam = exams
            .filter((e) => e.marks.length > 0)
            .map((exam) => ({
                id: exam.id,
                name: exam.name,
                subjects: exam.marks.map((m) => ({
                    subject: m.subject.name,
                    ...gradeSubject(
                        { marksObtained: m.marksObtained, totalMarks: m.totalMarks },
                        bands,
                    ),
                })),
                gpa: examGPA(exam.marks, bands),
            }));

        return { exams: perExam, cgpa: computeCgpa(perExam.map((e) => e.gpa)) };
    }


    /** The current grade bands, for the admin editor. */
    async bands() {
        return this.prisma.gradeBand.findMany({
            select: { id: true, minPercent: true, maxPercent: true, letter: true, point: true },
            orderBy: { minPercent: 'desc' },
        });
    }
    /** Replace the full grade-band set (validated contiguous, 0–100). */
    async replaceBands(bands: Band[]) {
        if (bands.length === 0) throw new BadRequestException('At least one band is required');
        const sorted = [...bands].sort((a, b) => b.minPercent - a.minPercent);
        for (const b of sorted) {
            if (b.minPercent < 0 || b.maxPercent > 100 || b.minPercent > b.maxPercent) {
                throw new BadRequestException(
                    `Invalid band range ${b.minPercent}–${b.maxPercent} (must be within 0–100)`,
                );
            }
        }
        // Contiguity + full coverage check.
        for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i].minPercent !== sorted[i + 1].maxPercent + 1) {
                throw new BadRequestException(
                    'Bands must be contiguous with no gaps or overlaps',
                );
            }
        }
        if (sorted[sorted.length - 1].minPercent !== 0 || sorted[0].maxPercent !== 100) {
            throw new BadRequestException('Bands must cover 0–100 exactly');
        }

        await this.prisma.$transaction([
            this.prisma.gradeBand.deleteMany(),
            this.prisma.gradeBand.createMany({ data: sorted }),
        ]);
        return this.prisma.gradeBand.findMany({ orderBy: { minPercent: 'desc' } });
    }
}
