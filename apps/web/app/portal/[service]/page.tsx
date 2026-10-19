// app/portal/[service]/page.tsx — the resolver behind the homepage's
// "Online Services" cards.
//
// A card points here. The resolver decides where the visitor actually
// goes: the service's page for their role, the public page for the
// service, or the login page (with a callback back here) when the
// service needs an account. Keeping the decision in one place is what
// lets the homepage say "Attendance" without knowing who is looking.
//
// The session cookie is httpOnly, so the role is read server-side from
// the API's /auth/me — the same way proxy.ts gates the portal routes.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findService, ROLE_HOME, type PortalRole } from "@/lib/online-services";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000";

const ROLES: PortalRole[] = ["ADMIN", "TEACHER", "STUDENT", "PARENT"];

function isPortalRole(value: string): value is PortalRole {
    return (ROLES as string[]).includes(value);
}

/** The signed-in role, or null when there is no valid session. */
async function currentRole(): Promise<PortalRole | null> {
    const token = (await cookies()).get("ghs_token")?.value;
    if (!token) return null;
    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: { cookie: `ghs_token=${token}` },
            cache: "no-store",
        });
        if (!res.ok) return null;
        const body = (await res.json()) as { data?: { role?: string } };
        const role = body.data?.role;
        return role && isPortalRole(role) ? role : null;
    } catch {
        return null;
    }
}

export default async function PortalServicePage({
    params,
}: {
    params: Promise<{ service: string }>;
}) {
    const { service } = await params;
    const known = findService(service);
    if (!known) redirect("/");

    const role = await currentRole();

    // A signed-out visitor: the public page if the service has one,
    // otherwise the login page with a callback back to this resolver.
    if (!role) {
        if (known.anonymous) redirect(known.anonymous);
        redirect(`/login?callbackUrl=/portal/${known.key}`);
    }

    // A signed-in visitor: the service's page for their role, or their
    // dashboard when the service has nothing for that role.
    redirect(known.routes[role] ?? ROLE_HOME[role]);
}
