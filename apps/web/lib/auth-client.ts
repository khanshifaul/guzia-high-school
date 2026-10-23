"use client";

// lib/auth-client.ts — session access for client components, backed by the
// API's cookie-based /auth/me. Mirrors the alumni-app useSession ergonomics.

import { useCallback, useEffect, useState } from "react";
import { api, RequestError } from "./api";

export interface SessionUser {
    id: string;
    email: string;
    fullName: string;
    role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
    status: string;
}

interface AuthState {
    user: SessionUser | null;
    loading: boolean;
}

/** Fetch the current session (cookie). Returns null when unauthenticated. */
export async function fetchSession(): Promise<SessionUser | null> {
    try {
        const payload = await api<{ data: SessionUser }>("/auth/me");
        return payload.data;
    } catch (err) {
        if (err instanceof RequestError && err.statusCode === 401) return null;
        throw err;
    }
}

export function useSession(): AuthState & { refresh: () => void } {
    const [state, setState] = useState<AuthState>({ user: null, loading: true });

    const load = useCallback(() => {
        setState((s) => ({ ...s, loading: true }));
        fetchSession()
            .then((user) => setState({ user, loading: false }))
            .catch(() => setState({ user: null, loading: false }));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return { ...state, refresh: load };
}

export async function login(email: string, password: string): Promise<SessionUser> {
    // The only caller that opts into the gateway retry: the API host wakes
    // from a cold start by answering 502 for a while, and login is the first
    // request a returning user makes. Re-sending is safe — a failed attempt
    // set no cookie, and a successful one resolves and stops the retries.
    const payload = await api<{ data: { user: SessionUser } }>("/auth/login", {
        method: "POST",
        body: { email, password },
        retryTransient: true,
    });
    return payload.data.user;
}

export async function logout(): Promise<void> {
    await api("/auth/logout", { method: "POST" });
}
