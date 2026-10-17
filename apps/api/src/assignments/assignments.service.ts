// src/assignments/assignments.service.ts — assignments + submissions + grading.
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

    async forClass(classId: string) {
        return this.prisma.assignment.findMany({
            where: { classId },
            include: {
                subject: true,
                teacher: { include: { user: { select: { fullName: true } } } },
                _count: { select: { submissions: true } },
            },
            orderBy: { dueDate: 'desc' },
        });
    }

    async create(dto: CreateAssignmentDto, teacherId: string) {
        const subject = await this.prisma.subject.findUnique({ where: { id: dto.subjectId } });
        if (!subject) throw new NotFoundException('Subject not found');
        const cls = await this.prisma.class.findUnique({ where: { id: dto.classId } });
        if (!cls) throw new NotFoundException('Class not found');

        return this.prisma.assignment.create({
            data: {
                title: dto.title,
                description: dto.description,
                subjectId: dto.subjectId,
                classId: dto.classId,
                teacherId,
                dueDate: new Date(dto.dueDate),
            },
        });
    }

    async remove(id: string) {
        await this.prisma.assignment.delete({ where: { id } }).catch(() => {
            throw new NotFoundException('Assignment not found');
        });
        return { deleted: true };
    }

    /** One assignment + all submissions (for the grading view). */
    async submissions(id: string) {
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
        return assignment;
    }

    /** A student submits their work (one per assignment). */
    async submit(assignmentId: string, studentId: string, dto: SubmitWorkDto) {
        const assignment = await this.prisma.assignment.findUnique({
            where: { id: assignmentId },
        });
        if (!assignment) throw new NotFoundException('Assignment not found');

        const existing = await this.prisma.submission.findUnique({
            where: { assignmentId_studentId: { assignmentId, studentId } },
        });
        if (existing) throw new ConflictException('You have already submitted this assignment');

        const late = new Date() > assignment.dueDate;
        return this.prisma.submission.create({
            data: {
                assignmentId,
                studentId,
                content: dto.content,
                status: late ? 'LATE' : 'ON_TIME',
            },
        });
    }

    /** Teacher grades a submission (must own the assignment; admin may grade any). */
    async grade(
        submissionId: string,
        dto: GradeSubmissionDto,
        grader: { id: string; role: string },
    ) {
        const submission = await this.prisma.submission.findUnique({
            where: { id: submissionId },
            include: { assignment: true },
        });
        if (!submission) throw new NotFoundException('Submission not found');
        if (
            grader.role !== 'ADMIN' &&
            submission.assignment.teacherId !== grader.id
        ) {
            throw new ForbiddenException('You can only grade your own assignments');
        }

        const late =
            submission.createdAt > submission.assignment.dueDate;
        return this.prisma.submission.update({
            where: { id: submissionId },
            data: {
                grade: dto.grade,
                feedback: dto.feedback,
                status: late ? 'LATE_GRADED' : 'ON_TIME',
            },
        });
    }
}
