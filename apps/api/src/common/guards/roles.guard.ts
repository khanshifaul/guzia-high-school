// src/common/guards/roles.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * SystemRole-based authorization guard.
 *
 * After F5 the singular `User.role` column is nullable with `customer` as
 * the default; the column stays in the schema because `store-auth.guard.ts:63`
 * reads `payload.role === 'customer'` for storefront access, but it is no
 * longer authoritative for backend API authorization. Only `systemRole`
 * (SYSTEM_ADMIN / SYSTEM_DEVELOPER / SYSTEM_AGENT / TENANT_OWNER /
 * TENANT_MEMBER) gates protected routes.
 *
 * If you need tenant-level membership checks (the caller belongs to the
 * tenant referenced in the path), use `assertCallerOwnsTenant` in the
 * service layer — see `common/utils/tenant-auth.util.ts`.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (user.role && requiredRoles.includes(user.role)) {
      return true;
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
