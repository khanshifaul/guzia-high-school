// src/teachers/teachers.service.ts — teacher CRUD + class-subject assignments.
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { CreateTeacherDto, UpdateTeacherDto } from './dto';

@Injectable()
export class TeachersService {
    constructor(private readonly prisma: DatabaseService) {}

    async findAll() {
        const teachers = await this.prisma.teacher.findMany({
            include: {
                user: { select: { id: true, email: true, fullName: true, status: true } },
                subjects: { include: { subject: true, class: true } },
            },
            orderBy: { employeeId: 'asc' },
        });
        return { data: teachers, meta: { total: teachers.length } };
    }

    async findOne(id: string) {
        const teacher = await this.prisma.teacher.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, email: true, fullName: true, status: true } },
                subjects: { include: { subject: true, class: true } },
                assignments: { include: { subject: true, class: true } },
            },
        });
        if (!teacher) throw new NotFoundException('Teacher not found');
        return teacher;
    }

    async create(dto: CreateTeacherDto) {
        const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existing) throw new ConflictException('A user with this email already exists');

        const count = await this.prisma.teacher.count();
        const passwordHash = await bcrypt.hash(dto.password, 10);

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                passwordHash,
                fullName: dto.fullName,
                role: 'TEACHER',
            },
        });

        return this.prisma.teacher.create({
            data: {
                userId: user.id,
                employeeId: `T-${String(count + 1).padStart(3, '0')}`,
                phone: dto.phone,
            },
            include: { user: { select: { email: true, fullName: true } } },
        });
    }

    /** Update a teacher's profile (name/phone) and their linked user's name. */
    async update(id: string, dto: UpdateTeacherDto) {
        const teacher = await this.prisma.teacher.findUnique({ where: { id } });
        if (!teacher) throw new NotFoundException('Teacher not found');

        return this.prisma.$transaction(async (tx) => {
            if (dto.fullName) {
                await tx.user.update({
                    where: { id: teacher.userId },
                    data: { fullName: dto.fullName },
                });
            }
            return tx.teacher.update({
                where: { id },
                data: { ...(dto.phone !== undefined ? { phone: dto.phone } : {}) },
                include: { user: { select: { id: true, email: true, fullName: true, status: true } } },
            });
        });
    }

    /** Block a teacher; login revoked with it. */
    async block(id: string) {
        const teacher = await this.prisma.teacher.findUnique({ where: { id } });
        if (!teacher) throw new NotFoundException('Teacher not found');
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: teacher.userId },
                data: { status: 'BLOCKED' },
            }),
        ]);
        return { blocked: true };
    }
}
