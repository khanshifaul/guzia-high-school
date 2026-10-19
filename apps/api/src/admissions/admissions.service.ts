import { ConflictException, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
// rule #4, extended): public submit creates a pending portal account +
// generates credentials (emailed via Resend), admin review → on APPROVE the
// pending user is activated and the enrolled Student is created atomically.
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';
import { ageFromDateOfBirth, isAdmissibleAge } from '../common/age.util';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { AdmissionDecision, ReviewApplicationDto } from './dto/review-application.dto';
import { UploadService } from '../upload/upload.service';
import { admissionPhotoProblem } from './admission-photo.util';
import { EditApplicationDto } from './dto/edit-application.dto';

@Injectable()
export class AdmissionsService {
    private readonly logger = new Logger(AdmissionsService.name);

    constructor(
        private readonly prisma: DatabaseService,
        private readonly email: EmailService,
        private readonly config: ConfigService,
        private readonly upload: UploadService,
    ) {}

    /**
     * Public submit: validate → create a pending portal account (role STUDENT,
     * status BLOCKED until approved) → create the application → email the
     * credentials. Returns the printable-form id + credentials (also shown
     * on-screen so the applicant can save/print even without email).
     */
    async submit(dto: SubmitApplicationDto) {

        // Honeypot: the field is hidden from people and must stay empty.
        // A bot that fills every input it sees gets a generic rejection and
        // never reaches the database.
        if (dto.website && dto.website.trim() !== '') {
            throw new BadRequestException('Application could not be submitted.');
        }

        // The age is DERIVED from the date of birth, never taken from the
        // client: an age the applicant typed can disagree with their date
        // of birth, and the school needs the two to agree. A date of birth
        // outside the school's age window is a data-entry slip, not a real
        // applicant, so it is refused here rather than left for an admin to
        // spot in the queue.
        const age = ageFromDateOfBirth(dto.dateOfBirth);
        if (dto.dateOfBirth && !isAdmissibleAge(age)) {
            throw new BadRequestException(
                'The date of birth does not match the age range for admission.',
            );
        }

        // The site settings decide what this school actually offers: an
        // application cannot pick a type or shift the admin has turned off.
        const settings = await this.prisma.siteSetting.findUnique({
            where: { id: 'singleton' },
        });
        const offeredTypes = (settings?.admissionTypes ?? 'day,residential')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);
        if (dto.admissionType && !offeredTypes.includes(dto.admissionType)) {
            throw new BadRequestException('That admission type is not offered by this school.');
        }
        const offeredShifts = (settings?.shifts ?? '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);
        if (dto.shift && !offeredShifts.includes(dto.shift)) {
            throw new BadRequestException('That shift is not offered by this school.');
        }

        const email = dto.email.trim();
        const existing = await this.prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new ConflictException(
                'An account with this email already exists. Contact the school office.',
            );
        }

        // An unguessable hash: the pending account cannot be logged into. The
        // real password is generated and handed to the admin on approval.
        const passwordHash = await bcrypt.hash(this.generatePassword(), 10);

        const user = await this.prisma.user.create({
            data: {
                email,
                passwordHash,
                fullName: dto.studentName,
                role: 'STUDENT',
                status: 'BLOCKED', // activated on admin approval
            },
        });

        // The honeypot is a spam trap, not part of the application. The age
        // is not a field of the DTO at all — it is spread in LAST below, so
        // a client that sent one anyway has it overwritten by the age the
        // server derived from the date of birth.
        const { website: _honeypot, ...formData } = dto;
        const application = await this.prisma.admissionApplication.create({
            data: {
                formData: age === null ? formData : { ...formData, age },
                status: 'SUBMITTED',
                userId: user.id,
            },
        });

        // Fire-and-forget the email; never fail the application over it.
        void this.email
            .sendAdmissionReceived({
                to: email,
                studentName: dto.studentName,
                applicationId: application.id,
                classWanted: dto.classWanted,
            })
            .then((sent) => {
                if (!sent) {
                    this.logger.warn(
                        `Credentials email not sent for ${email} (RESEND not configured?) — shown on-screen only.`,
                    );
                }
            });

        // The applicant gets an application number, not credentials: the
        // account stays BLOCKED until an admin approves it, so a password
        // shown here could not be used. The admin hands over the password
        // that is generated at approval time.
        return {
            id: application.id,
            status: application.status,
            studentName: dto.studentName,
            classWanted: dto.classWanted,
            emailSent: this.email.enabled,
        };
    }

    /**
     * Public: store an admission attachment. The student photo is held to the
     * ID-card rule (exactly 300x300, max 1 MB) before anything is written; the
     * other attachments only need an allowed type and size.
     */
    async storeAttachment(
        file: { buffer: Buffer; originalname: string; mimetype: string } | undefined,
        kind: string | undefined,
    ) {
        if (!file) throw new BadRequestException('No file provided (use form field "file")');
        if (kind === 'photo') {
            const problem = admissionPhotoProblem(file.buffer, file.mimetype, file.buffer.byteLength);
            if (problem) throw new BadRequestException(problem);
        }
        return this.upload.storeFile(file.buffer, file.originalname, file.mimetype, 'admissions');
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

        // The applicant never picks a section: the administration assigns one
        // at approval. A section picked in the UI is honoured only when it
        // really belongs to the class being enrolled into.
        const section = dto.sectionId
            ? await this.prisma.section.findFirst({
                  where: { id: dto.sectionId, classId: cls.id },
              })
            : await this.prisma.section.findFirst({
                  where: { classId: cls.id },
                  orderBy: { name: 'asc' },
              });
        if (dto.sectionId && !section) {
            throw new BadRequestException('The selected section does not belong to this class');
        }

        const studentCount = await this.prisma.student.count({ where: { classId: cls.id } });
        const rollNo = studentCount + 1;
        const seq = (await this.prisma.student.count()) + 1;
        const admissionNo = `GHS-${new Date().getFullYear()}-${String(seq).padStart(3, '0')}`;
        const fullName = String(formData.studentName ?? 'New Student');

        if (application.userId) {
            // Activate the pending account created at submit time and give it a
            // fresh password: the applicant never saw one, so this is the only
            // set of credentials that will work.
            const password = this.generatePassword();
            const passwordHash = await bcrypt.hash(password, 10);
            await this.prisma.$transaction([
                this.prisma.user.update({
                    where: { id: application.userId },
                    data: { status: 'ACTIVE', fullName, passwordHash },
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
            return {
                status: 'APPROVED' as const,
                admissionNo,
                rollNo,
                email: user?.email ?? '',
                generatedPassword: password,
            };
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
