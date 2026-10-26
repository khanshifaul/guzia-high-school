// lib/online-services.ts — where each portal service LIVES for each role.
//
// The service's title and description are content, so they are stored in the
// `services` block of the home page (apps/api/src/pages/page-seed.ts) and
// rendered from there. This file keeps only what is code: the key that joins a
// card to its routes, the per-role destinations, and the anonymous target.
// The homepage and the /portal/[service] resolver read the same keys, so there
// is no second list to drift.

export type PortalRole = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";

export interface OnlineService {
    /** The URL segment: /portal/<key>. Must match the item key in the block. */
    key: string;
    /**
     * Where the service lives for each role. A role with no entry for the
     * service falls back to its dashboard.
     */
    routes: Partial<Record<PortalRole, string>>;
    /**
     * Where a signed-out visitor goes. `null` means the service needs an
     * account, so the visitor is sent to the login page with a callback
     * back to the resolver.
     */
    anonymous: string | null;
}

export const ONLINE_SERVICES: OnlineService[] = [
    {
        key: "admission",
        // Applying is public; an applicant with an account tracks their
        // application, and the staff review the queue.
        routes: {
            STUDENT: "/student/admissions",
            PARENT: "/student/admissions",
            ADMIN: "/admin/admissions",
        },
        anonymous: "/admission",
    },
    {
        key: "attendance",
        routes: {
            STUDENT: "/student/attendance",
            PARENT: "/parent/attendance",
            TEACHER: "/teacher/attendance",
            ADMIN: "/admin/attendance",
        },
        anonymous: null,
    },
    {
        key: "grades",
        routes: {
            STUDENT: "/student/grades",
            PARENT: "/parent/progress",
            TEACHER: "/teacher/grades",
            ADMIN: "/admin/grades",
        },
        anonymous: null,
    },
    {
        key: "fees",
        routes: {
            STUDENT: "/student/fees",
            PARENT: "/parent/fees",
            ADMIN: "/admin/fees",
        },
        anonymous: null,
    },
];

/** The role's home page, used when a role has no page for a service. */
export const ROLE_HOME: Record<PortalRole, string> = {
    ADMIN: "/admin",
    TEACHER: "/teacher",
    STUDENT: "/student",
    PARENT: "/parent",
};

export function findService(key: string): OnlineService | undefined {
    return ONLINE_SERVICES.find((s) => s.key === key);
}
