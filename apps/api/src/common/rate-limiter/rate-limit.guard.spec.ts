// src/common/rate-limiter/rate-limit.guard.spec.ts — protects the rate
// limiter actually limiting.
//
// The decorator and the guard have to agree on the metadata key. They did
// not: the decorator used `Reflect.metadata('rate-limit', …)`, which keys
// the metadata by the *method name*, while the guard read
// `Reflect.getMetadata('rate-limit', handler)`, which looks the metadata up
// under the literal string 'rate-limit'. The lookup always missed, so no
// route was ever limited and the 429 never fired.
import { ExecutionContext, HttpException } from '@nestjs/common';
import { RATE_LIMIT_KEY, RateLimit, RateLimitGuard } from './rate-limit.guard';
import { RateLimiterService } from './rate-limiter.service';

/** A context whose handler carries the metadata a real route would carry. */
function contextFor(handler: object, user?: { id: string }): ExecutionContext {
    return {
        getHandler: () => handler,
        getClass: () => class NoLimit {},
        switchToHttp: () => ({
            getRequest: () => ({ user, ip: '127.0.0.1' }),
        }),
    } as unknown as ExecutionContext;
}

describe('RateLimitGuard', () => {
    function guardWith(limits: Record<string, { windowMs: number; maxRequests: number }>) {
        const limiter = new RateLimiterService();
        for (const [scope, limit] of Object.entries(limits)) {
            limiter.registerLimit(scope, limit.windowMs, limit.maxRequests);
        }
        return { guard: new RateLimitGuard(limiter), limiter };
    }

    it('reads the metadata the decorator writes', () => {
        // The decorator must land the limit under the key the guard reads.
        class Handler {
            @RateLimit('ai:generate', 60_000, 10)
            generate(): void {}
        }
        const meta = Reflect.getMetadata(RATE_LIMIT_KEY, Handler.prototype.generate) as
            | { scope: string; windowMs: number; maxRequests: number }
            | undefined;
        expect(meta).toEqual({ scope: 'ai:generate', windowMs: 60_000, maxRequests: 10 });
    });

    it('lets a request through when the route declares no limit', async () => {
        const { guard } = guardWith({ 'ai:generate': { windowMs: 60_000, maxRequests: 1 } });
        const handler = {};
        await expect(guard.canActivate(contextFor(handler, { id: 'user-1' }))).resolves.toBe(true);
    });

    it('rejects a request past the limit with a 429', async () => {
        const { guard } = guardWith({ 'ai:generate': { windowMs: 60_000, maxRequests: 2 } });
        class Handler {
            @RateLimit('ai:generate', 60_000, 2)
            generate(): void {}
        }
        const handler = Handler.prototype.generate;
        const context = contextFor(handler, { id: 'user-1' });

        await expect(guard.canActivate(context)).resolves.toBe(true);
        await expect(guard.canActivate(context)).resolves.toBe(true);
        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(HttpException);
    });

    it('counts each user separately', async () => {
        const { guard } = guardWith({ 'ai:generate': { windowMs: 60_000, maxRequests: 1 } });
        class Handler {
            @RateLimit('ai:generate', 60_000, 1)
            generate(): void {}
        }
        const handler = Handler.prototype.generate;

        await expect(
            guard.canActivate(contextFor(handler, { id: 'user-1' })),
        ).resolves.toBe(true);
        await expect(
            guard.canActivate(contextFor(handler, { id: 'user-1' })),
        ).rejects.toBeInstanceOf(HttpException);
        // A different user has their own budget.
        await expect(
            guard.canActivate(contextFor(handler, { id: 'user-2' })),
        ).resolves.toBe(true);
    });

    it('falls back to a limit declared on the controller', async () => {
        const { guard } = guardWith({ 'ai:generate': { windowMs: 60_000, maxRequests: 1 } });
        @RateLimit('ai:generate', 60_000, 1)
        class Controller {
            generate(): void {}
        }
        const context = {
            getHandler: () => ({}),
            getClass: () => Controller,
            switchToHttp: () => ({
                getRequest: () => ({ user: { id: 'user-1' }, ip: '127.0.0.1' }),
            }),
        } as unknown as ExecutionContext;

        await expect(guard.canActivate(context)).resolves.toBe(true);
        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(HttpException);
    });
});
