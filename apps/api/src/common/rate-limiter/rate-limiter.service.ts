// src/common/rate-limiter/rate-limiter.service.ts — in-memory fixed-window
// rate limiter (single-instance; documented limitation, matches spec 10).
// Keys: userId + scope. Returns { allowed, remaining, resetInMs }.
import { Injectable } from '@nestjs/common';

interface Bucket {
    count: number;
    windowStart: number;
}

interface Limit {
    windowMs: number;
    maxRequests: number;
}

@Injectable()
export class RateLimiterService {
    private readonly buckets = new Map<string, Bucket>();
    private readonly limits = new Map<string, Limit>();

    /** Register a limit for a scope (e.g. 'ai:generate' → 10 per 60s). */
    registerLimit(scope: string, windowMs: number, maxRequests: number): void {
        this.limits.set(scope, { windowMs, maxRequests });
    }

    /** Consume one request for `key` under `scope`. Throws when over the limit. */
    consume(key: string, scope: string): { allowed: boolean; remaining: number; resetInMs: number } {
        const limit = this.limits.get(scope);
        if (!limit) {
            return { allowed: true, remaining: Number.MAX_SAFE_INTEGER, resetInMs: 0 };
        }
        const now = Date.now();
        const bucketKey = `${scope}:${key}`;
        let bucket = this.buckets.get(bucketKey);
        if (!bucket || now - bucket.windowStart >= limit.windowMs) {
            bucket = { count: 0, windowStart: now };
            this.buckets.set(bucketKey, bucket);
        }
        bucket.count += 1;
        const remaining = Math.max(0, limit.maxRequests - bucket.count);
        const resetInMs = limit.windowMs - (now - bucket.windowStart);
        if (bucket.count > limit.maxRequests) {
            return { allowed: false, remaining: 0, resetInMs: Math.max(0, resetInMs) };
        }
        return { allowed: true, remaining, resetInMs };
    }
}
