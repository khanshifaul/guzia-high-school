// src/common/rate-limiter/rate-limit.guard.ts — NestJS guard wrapping
// RateLimiterService. Use @RateLimit(scope, windowMs, maxRequests) on a
// route handler or controller.
import {
    CanActivate,
    ExecutionContext,
    Injectable,
    Logger,
    HttpException,
} from '@nestjs/common';
import { RateLimiterService } from './rate-limiter.service';

interface RateLimitMeta {
    scope: string;
    windowMs: number;
    maxRequests: number;
}

/** Declares a rate limit on a route handler. */
export const RateLimit = (scope: string, windowMs: number, maxRequests: number) =>
    Reflect.metadata('rate-limit', { scope, windowMs, maxRequests });

@Injectable()
export class RateLimitGuard implements CanActivate {
    private readonly logger = new Logger(RateLimitGuard.name);

    constructor(private readonly limiter: RateLimiterService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const handler = context.getHandler();
        const meta = Reflect.getMetadata('rate-limit', handler) as RateLimitMeta | undefined;
        if (!meta) return true;

        const req = context.switchToHttp().getRequest();
        const user = req.user as { id?: string } | undefined;
        const key = `rl:${meta.scope}:${user?.id ?? req.ip ?? 'anonymous'}`;

        const result = this.limiter.consume(key, meta.scope);
        if (!result.allowed) {
            throw new HttpException(
                `Rate limit exceeded. Try again in ${Math.ceil(result.resetInMs / 1000)}s.`,
                429,
            );
        }
        return true;
    }
}
