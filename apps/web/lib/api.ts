"use client";

// lib/api.ts — typed fetch wrapper. The browser talks same-origin to Next
// (rewritten to the API), so the httpOnly ghs_token cookie is sent automatically.
// Errors are normalized to ApiError so pages can render inline banners.

export interface ApiError {
    statusCode: number;
    message: string[];
    error: string;
}

export class RequestError extends Error {
    readonly statusCode: number;
    readonly messages: string[];

    constructor(statusCode: number, messages: string[]) {
        super(messages.join("; "));
        this.name = "RequestError";
        this.statusCode = statusCode;
        this.messages = messages;
    }
}

interface RequestOptions {
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    body?: unknown;
    cache?: RequestCache;
    /** Retry a transient gateway failure (502/503/504) with a short backoff.
     *  Off by default: re-sending a write is only safe for the one caller that
     *  opts in — `login()`, where a Render cold start answers 502 HTML. */
    retryTransient?: boolean;
}

/** Gateway statuses the API's host returns while the service is not serving:
 *  Render answers 502 during a cold start, and the proxy answers 503/504 while
 *  the upstream is unreachable. */
const TRANSIENT_STATUSES = new Set([502, 503, 504]);

/** Backoff before each retry, in milliseconds. Two retries, matching the brief. */
const RETRY_DELAYS_MS = [750, 2000];

/** What a user sees when every attempt hit a gateway failure. Deliberately
 *  states that the server is waking, never that their credentials are wrong. */
export const SERVER_WAKING_MESSAGE =
    "The server is waking up. Please wait a few seconds and try again.";

/** Parse a response body without ever throwing. A gateway error page is HTML,
 *  and `JSON.parse` on it used to surface as "Unexpected token '<'" — a parse
 *  error rendered to the user in place of the real condition. */
function parseBody(text: string): unknown {
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function sleep(ms: number): Promise<void> {
    const { promise, resolve } = Promise.withResolvers<void>();
    setTimeout(resolve, ms);
    return promise;
}

/** Single fetch entry point for every API call. Attaches credentials (cookie),
 *  JSON-encodes bodies, and throws RequestError on non-2xx. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", body, cache = "no-store", retryTransient = false } = options;
    const maxRetries = retryTransient ? RETRY_DELAYS_MS.length : 0;

    for (let attempt = 0; ; attempt++) {
        const res = await fetch(`/api${path}`, {
            method,
            cache,
            credentials: "include",
            headers: body ? { "Content-Type": "application/json" } : undefined,
            body: body ? JSON.stringify(body) : undefined,
        });

        const data = parseBody(await res.text());

        if (!res.ok) {
            if (retryTransient && TRANSIENT_STATUSES.has(res.status) && attempt < maxRetries) {
                await sleep(RETRY_DELAYS_MS[attempt]);
                continue;
            }
            // A gateway answered with its own HTML page: the API never saw the
            // request, so the honest message is that the server is not up yet.
            if (TRANSIENT_STATUSES.has(res.status) && data === null) {
                throw new RequestError(res.status, [SERVER_WAKING_MESSAGE]);
            }
            throw new RequestError(res.status, extractMessages(data, res.status));
        }

        return data as T;
    }
}

function extractMessages(data: unknown, status: number): string[] {
    if (data && typeof data === "object") {
        // The API's error envelope puts the detail in `errors` and a generic
        // label in `message` ("Validation failed"), so prefer the detail.
        if ("errors" in data) {
            const detail = data.errors;
            if (Array.isArray(detail) && detail.length > 0) return detail.map(String);
            if (typeof detail === "string" && detail) return [detail];
        }

        if ("message" in data) {
            const raw = data.message;
            if (Array.isArray(raw)) return raw.map(String);
            if (typeof raw === "string") return [raw];
        }
    }
    return [`Request failed (${status})`];
}

/** Most endpoints wrap payloads as { success, message, data }. Unwrap helper. */
export function unwrap<T>(payload: { data: T }): T {
    return payload.data;
}
