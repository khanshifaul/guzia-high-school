// src/common/guards/access-token.guard.ts — slimmed from zylosync:
// same Public-route handling, minus ContextService / refresh-route special case.
import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AccessTokenGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(AccessTokenGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = { id: string }>(
    err: unknown,
    user: TUser | false | null,
    info: { message?: string } | undefined,
    context: ExecutionContext,
  ): TUser {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return (user ?? null) as TUser;
    }

    if (err || !user) {
      this.logger.debug(`Auth failed: ${info?.message || 'unknown reason'}`);
      if (err instanceof Error) throw err;
      throw new UnauthorizedException('Access token is invalid or expired');
    }

    return user;
  }
}
