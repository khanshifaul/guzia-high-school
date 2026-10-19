import { ConflictException, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
// rule #4, extended): public submit creates a pending portal account +
// generates credentials (emailed via Resend), admin review → on APPROVE the
// pending user is activated and the enrolled Student is created atomically.
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { AdmissionDecision, ReviewApplicationDto } from './dto/review-application.dto';
import { EditApplicationDto } from './dto/edit-application.dto';

@Injectable()
export class AdmissionsService {
    private readonly logger = new Logger(AdmissionsService.name);

    constructor(
        private readonly prisma: DatabaseService,
        private readonly email: EmailService,
        private readonly config: ConfigService,
    ) {}

    /**
     * Public submit: validate → create a pending portal account (role STUDENT,
     * status BLOCKED until approved) → create the application → email the
     * credentials. Returns the printable-form id + credentials (also shown
     * on-screen so the applicant can save/print even without email).
     */
    async submit(dto: SubmitApplicationDto) {
        const email = dto.email.trim();
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new ConflictException(
                'An account with this email already exists. Contact the school office.',
            );
        }

        // Strong one-time portal password (shown/emailed once).
        const password = this.generatePassword();
        const passwordHash = await bcrypt.hash(password, 10);

        // Username for the portal is the applicant's email (auth is email-based).
        const username = email;

        const user = await this.prisma.user.create({
            data: {
                email,
                passwordHash,
                fullName: dto.studentName,
                role: 'STUDENT',
                status: 'BLOCKED', // activated on admin approval
            },
        });

        const application = await this.prisma.admissionApplication.create({
            data: {
                formData: { ...dto },
                status: 'SUBMITTED',
                userId: user.id,
            },
        });

        // Fire-and-forget the email; never fail the application over it.
        void this.email
            .sendAdmissionCredentials({
                to: email,
                studentName: dto.studentName,
                applicationId: application.id,
                username,
                password,
                classWanted: dto.classWanted,
            })
            .then((sent) => {
                if (!sent) {
                    this.logger.warn(
                        `Credentials email not sent for ${email} (RESEND not configured?) — shown on-screen only.`,
                    );
                }
            });

        return {
            id: application.id,
            status: application.status,
            username,
            password,
            studentName: dto.studentName,
            classWanted: dto.classWanted,
            emailSent: this.email.enabled,
        };
    }

    /** Admin: review queue (optionally filter by status and class wanted). */
    async queue(status?: string, className?: string) {
        const where: Record<string, unknown> = {};
        if (status) where.status = status;
        if (className) where.formData = { path: ['classWanted'], equals: className };
        const applications = await this.prisma.admissionApplication.findMany({
            where,
            orderBy: { submittedAt: 'desc' },
        });
        return { data: applications, meta: { total: applications.length } };
    }

    /** Applicant: their own application (self-scoped by JWT userId). */
    async me(userId: string) {
        const application = await this.prisma.admissionApplication.findFirst({
            where: { userId },
        });
        if (!application)
            throw new NotFoundException('No application found for your account');
        return application;
    }

    /** Admin: edit a submitted application's formData. Locked once reviewed. */
    async edit(id: string, dto: EditApplicationDto) {
        const application = await this.prisma.admissionApplication.findUnique({
            where: { id },
        });
        if (!application) throw new NotFoundException('Application not found');
        if (application.status !== 'SUBMITTED') {
            throw new ConflictException(
                'This application has already been reviewed and cannot be edited',
            );
        }
        const updated = await this.prisma.admissionApplication.update({
            where: { id },
            data: {
                formData: { ...(application.formData as Record<string, string>), ...dto.formData },
            },
        });
        return updated;
    }

    async findOne(id: string) {
        const app = await this.prisma.admissionApplication.findUnique({ where: { id } });
        if (!app) throw new NotFoundException('Application not found');
        return app;
    }

    /**
     * Admin reviews an application. APPROVE activates the pending portal
     * account and creates the enrolled Student atomically; REJECT revokes the
     * pending account and flips status. Re-review → 409.
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
            await this.prisma.$transaction([
                this.prisma.admissionApplication.update({
                    where: { id },
                    data: {
                        status: 'REJECTED',
                        reviewedById: reviewerId,
                        reviewNote: dto.note,
                        reviewedAt: new Date(),
                    },
                }),
                // Revoke the pending portal account on rejection.
                ...(application.userId
                    ? [
                          this.prisma.user.update({
                              where: { id: application.userId },
                              data: { status: 'BLOCKED' },
                          }),
                      ]
                    : []),
            ]);
            return { status: 'REJECTED' as const };
        }

        // APPROVE: activate pending user + create enrolled student atomically.
        const formData = application.formData as Record<string, unknown>;
        const classWanted = String(formData.classWanted ?? '');
        const cls = await this.prisma.class.findUnique({ where: { name: classWanted } });
        if (!cls) throw new NotFoundException(`Class "${classWanted}" not found`);

        const section = await this.prisma.section.findFirst({
            where: { classId: cls.id },
            orderBy: { name: 'asc' },
        });

        const studentCount = await this.prisma.student.count({ where: { classId: cls.id } });
        const rollNo = studentCount + 1;
        const seq = (await this.prisma.student.count()) + 1;
        const admissionNo = `GHS-${new Date().getFullYear()}-${String(seq).padStart(3, '0')}`;
        const fullName = String(formData.studentName ?? 'New Student');

        if (application.userId) {
            // Activate the pending account created at submit time.
            await this.prisma.$transaction([
                this.prisma.user.update({
                    where: { id: application.userId },
                    data: { status: 'ACTIVE', fullName },
                }),
                this.prisma.student.create({
                    data: {
                        userId: application.userId,
                        admissionNo,
                        fullName,
                        classId: cls.id,
                        sectionId: section?.id,
                        rollNo,
                    },
                }),
                this.prisma.admissionApplication.update({
                    where: { id },
                    data: {
                        status: 'APPROVED',
                        reviewedById: reviewerId,
                        reviewNote: dto.note,
                        reviewedAt: new Date(),
                    },
                }),
            ]);
            const user = await this.prisma.user.findUnique({ where: { id: application.userId } });
            return { status: 'APPROVED' as const, admissionNo, rollNo, email: user?.email ?? '' };
        }

        // Legacy path (no pending user): create login + student together.
        const email = String(formData.email ?? '').trim();
        if (!email) throw new BadRequestException('Applicant email is required');
        const dup = await this.prisma.user.findUnique({ where: { email } });
        if (dup) throw new ConflictException('A user with this email already exists');
        const password = this.generatePassword();
        const passwordHash = await bcrypt.hash(password, 10);

        await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: { email, passwordHash, fullName, role: 'STUDENT' },
            });
            await tx.student.create({
                data: {
                    userId: user.id,
                    admissionNo,
                    fullName,
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

        return { status: 'APPROVED' as const, admissionNo, rollNo, email, generatedPassword: password };
    }

    /** URL-safe strong password, e.g. "kT7-pQm2-Xr9". */
    private generatePassword(): string {
        const raw = randomBytes(9).toString('base64url').replace(/[-_]/g, '');
        return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
    }
}
