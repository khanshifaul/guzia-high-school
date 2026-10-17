// src/auth/authentication/authentication.service.ts — slimmed from zylosync's
// AuthenticationService: local credential validation + login flow only
// (no sessions, 2FA, OAuth, verification, password reset in this scope).
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../../database/database.service';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

export interface LoginResult {
  user: { id: string; email: string; fullName: string; role: string };
  accessToken: string;
}

@Injectable()
export class AuthenticationService {
  private readonly logger = new Logger(AuthenticationService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /** Used by LocalStrategy (passport-local). Returns null on any mismatch. */
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return null;
    }
    if (user.status !== 'ACTIVE') {
      return null;
    }
    return user;
  }

  async handleLoginFlow(email: string, password: string): Promise<LoginResult> {
    const user = await this.validateUser(email, password);
    if (!user) {
      // Uniform failure message: never reveal whether the email exists.
      this.logger.warn(`Login failed for email: ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    this.logger.log(`Login successful for user: ${user.email} (${user.role})`);
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      accessToken,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, role: true, status: true },
    });
    if (!user) {
      throw new UnauthorizedException();
    }

    // Role-specific linked ids the portal pages need (specs/06): a student's
    // own Student row, a teacher's Teacher row, a parent's children.
    if (user.role === 'STUDENT') {
      const student = await this.prisma.student.findUnique({
        where: { userId },
        select: { id: true, classId: true },
      });
      return { ...user, studentId: student?.id ?? null, classId: student?.classId ?? null };
    }
    if (user.role === 'TEACHER') {
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId },
        select: { id: true },
      });
      return { ...user, teacherId: teacher?.id ?? null };
    }
    if (user.role === 'PARENT') {
      const children = await this.prisma.student.findMany({
        where: { parent: { userId } },
        select: { id: true },
      });
      return { ...user, childIds: children.map((c) => c.id) };
    }
    return user;
  }
}
