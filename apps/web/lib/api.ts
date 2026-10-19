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
}

/** Single fetch entry point for every API call. Attaches credentials (cookie),
 *  JSON-encodes bodies, and throws RequestError on non-2xx. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", body, cache = "no-store" } = options;

    const res = await fetch(`/api${path}`, {
        method,
        cache,
        credentials: "include",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    const data: unknown = text ? JSON.parse(text) : null;

    if (!res.ok) {
        const messages = extractMessages(data, res.status);
        throw new RequestError(res.status, messages);
    }

    return data as T;
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
