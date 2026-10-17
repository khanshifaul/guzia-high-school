// src/admissions/admissions.service.ts — the admission workflow: public
// submit → admin review → on APPROVE, transactionally create the enrolled
// student + their login (specs/06 rule #4).
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { AdmissionDecision, ReviewApplicationDto } from './dto/review-application.dto';

@Injectable()
export class AdmissionsService {
    constructor(private readonly prisma: DatabaseService) {}

    /** Public: anyone can submit an application. */
    async submit(dto: SubmitApplicationDto) {
        const application = await this.prisma.admissionApplication.create({
            data: {
                formData: { ...dto },
                status: 'SUBMITTED',
            },
        });
        return { id: application.id, status: application.status };
    }

    /** Admin: review queue (optionally filter by status). */
    async queue(status?: string) {
        const applications = await this.prisma.admissionApplication.findMany({
            where: status ? { status: status as 'SUBMITTED' } : {},
            orderBy: { submittedAt: 'desc' },
        });
        return { data: applications, meta: { total: applications.length } };
    }

    async findOne(id: string) {
        const app = await this.prisma.admissionApplication.findUnique({ where: { id } });
        if (!app) throw new NotFoundException('Application not found');
        return app;
    }

    /**
     * Admin reviews an application. APPROVE runs a transaction that creates the
     * enrolled student and their login; REJECT only flips status. Re-review → 409.
     */
    async review(id: string, dto: ReviewApplicationDto, reviewerId: string) {
        const application = await this.prisma.admissionApplication.findUnique({
            where: { id },
        });
        if (!application) throw new NotFoundException('Application not found');
        if (application.status !== 'SUBMITTED') {
            throw new ConflictException('This application has already been reviewed');
        }

        if (dto.decision === AdmissionDecision.REJECTED) {
            await this.prisma.admissionApplication.update({
                where: { id },
                data: {
                    status: 'REJECTED',
                    reviewedById: reviewerId,
                    reviewNote: dto.note,
                    reviewedAt: new Date(),
                },
            });
            return { status: 'REJECTED' as const };
        }

        // APPROVE: create login + enrolled student atomically.
        const formData = application.formData as Record<string, unknown>;
        const classWanted = String(formData.classWanted ?? '');
        const cls = await this.prisma.class.findUnique({ where: { name: classWanted } });
        if (!cls) throw new NotFoundException(`Class "${classWanted}" not found`);

        const section = await this.prisma.section.findFirst({
            where: { classId: cls.id },
            orderBy: { name: 'asc' },
        });

        const email = String(formData.email ?? '');
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) throw new ConflictException('A user with this email already exists');

        const studentCount = await this.prisma.student.count({ where: { classId: cls.id } });
        const rollNo = studentCount + 1;
        const seq = (await this.prisma.student.count()) + 1;
        const admissionNo = `GHS-${new Date().getFullYear()}-${String(seq).padStart(3, '0')}`;

        // Deterministic demo password, shown once to the admin (documented in README).
        const generatedPassword = `ghs${admissionNo.slice(-4)}!`;
        const passwordHash = await bcrypt.hash(generatedPassword, 10);

        await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email,
                    passwordHash,
                    fullName: String(formData.studentName ?? 'New Student'),
                    role: 'STUDENT',
                },
            });
            await tx.student.create({
                data: {
                    userId: user.id,
                    admissionNo,
                    fullName: String(formData.studentName ?? 'New Student'),
                    classId: cls.id,
                    sectionId: section?.id,
                    rollNo,
                },
            });
            await tx.admissionApplication.update({
                where: { id },
                data: {
                    status: 'APPROVED',
                    reviewedById: reviewerId,
                    reviewNote: dto.note,
                    reviewedAt: new Date(),
                },
            });
        });

        return {
            status: 'APPROVED' as const,
            admissionNo,
            rollNo,
            email,
            generatedPassword,
        };
    }
}
