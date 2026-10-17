// proxy.ts — Next.js 16 middleware (NOT middleware.ts; Next 16 renamed it).
// Role-based route gating: unauthenticated → /login; wrong role → role home.
// The session cookie is httpOnly, so we call the API's /auth/me server-side.

import { NextResponse, type NextRequest } from "next/server";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:4000";

const ROLE_HOME: Record<string, string> = {
    ADMIN: "/admin",
    TEACHER: "/teacher",
    STUDENT: "/student",
    PARENT: "/parent",
};

// Which top-level portal segment each role may access.
const ROLE_PREFIX: Record<string, string[]> = {
    ADMIN: ["/admin"],
    TEACHER: ["/teacher"],
    STUDENT: ["/student"],
    PARENT: ["/parent"],
};

async function fetchRole(request: NextRequest): Promise<string | null> {
    const cookie = request.cookies.get("ghs_token")?.value;
    if (!cookie) return null;
    try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
            headers: { cookie: `ghs_token=${cookie}` },
            cache: "no-store",
        });
        if (!res.ok) return null;
        const body = (await res.json()) as { data?: { role?: string } };
        return body.data?.role ?? null;
    } catch {
        return null;
    }
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Only gate portal routes; public + login pass through.
    const isPortal = Object.values(ROLE_PREFIX)
        .flat()
        .some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
    if (!isPortal) return NextResponse.next();

    const role = await fetchRole(request);

    // Unauthenticated → login with a callback back to the intended page.
    if (!role) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Authenticated but hitting a foreign role's segment → send to own home.
    const allowed = ROLE_PREFIX[role] ?? [];
    const permitted = allowed.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
    if (!permitted) {
        return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/login", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*", "/teacher/:path*", "/student/:path*", "/parent/:path*"],
};
