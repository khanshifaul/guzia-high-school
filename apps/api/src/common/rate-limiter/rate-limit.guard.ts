// src/common/rate-limiter/rate-limit.guard.ts — NestJS guard wrapping
// RateLimiterService. Use @RateLimit(scope, windowMs, maxRequests) on a
// route handler or controller.
import {
    CanActivate,
    ExecutionContext,
    HttpException,
    Injectable,
    SetMetadata,
} from '@nestjs/common';
import { RateLimiterService } from './rate-limiter.service';

interface RateLimitMeta {
    scope: string;
    windowMs: number;
    maxRequests: number;
}

/** The metadata key the guard reads. The decorator and the guard must
  *  agree on it — `Reflect.metadata(key, …)` keys by the *method name*, so
  *  it can never be looked up again under 'rate-limit'. */
export const RATE_LIMIT_KEY = 'rate-limit';

/** Declares a rate limit on a route handler. */
export const RateLimit = (scope: string, windowMs: number, maxRequests: number) =>
    SetMetadata(RATE_LIMIT_KEY, { scope, windowMs, maxRequests });

@Injectable()
export class RateLimitGuard implements CanActivate {
    constructor(private readonly limiter: RateLimiterService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // The handler's own limit wins; a class-level @RateLimit is the
        // fallback, so a whole controller can be limited at once.
        const handler = context.getHandler();
        const controller = context.getClass();
        const meta =
            (Reflect.getMetadata(RATE_LIMIT_KEY, handler) as RateLimitMeta | undefined) ??
            (Reflect.getMetadata(RATE_LIMIT_KEY, controller) as RateLimitMeta | undefined);
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
