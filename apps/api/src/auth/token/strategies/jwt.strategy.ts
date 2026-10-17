// src/auth/token/strategies/jwt.strategy.ts — adapted from zylosync's
// token strategy: cookie-or-bearer extraction, live user check (status must
// be ACTIVE), slim payload (no sessions / tenancy / onboarding flags).
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { DatabaseService } from '../../../database/database.service';
import { AUTH_COOKIE } from '../../../common/cookie.util';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

function cookieOrBearerExtractor(req: Request): string | null {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  const fromCookie = cookies?.[AUTH_COOKIE];
  if (fromCookie) return fromCookie;
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: DatabaseService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieOrBearerExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<{
    id: string;
    sub: string;
    email: string;
    role: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException();
    }

    // RolesGuard reads `user.role` for @Roles(...) checks.
    return { id: user.id, sub: user.id, email: user.email, role: user.role };
  }
}
