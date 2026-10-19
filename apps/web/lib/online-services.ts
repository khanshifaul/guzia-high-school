// lib/online-services.ts — the public homepage's "Online Services" section.
//
// One definition per service, shared by the homepage (which renders the
// cards) and the /portal/[service] resolver (which knows where each
// service lives for each role). The homepage and the resolver must agree
// on where a service goes, so they read the same table — there is no
// second list to drift.

import type { IconType } from "react-icons";
import {
    FaUserCheck,
    FaCalendarCheck,
    FaGraduationCap,
    FaMoneyBillWave,
} from "react-icons/fa6";

export type PortalRole = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";

export interface OnlineService {
    /** The URL segment: /portal/<key>. */
    key: string;
    icon: IconType;
    title: string;
    desc: string;
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
        icon: FaUserCheck,
        title: "Online Admission",
        desc: "Apply and track admission online.",
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
        icon: FaCalendarCheck,
        title: "Attendance",
        desc: "Daily attendance for students & parents.",
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
        icon: FaGraduationCap,
        title: "Results & GPA",
        desc: "Published results with canonical GPA.",
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
        icon: FaMoneyBillWave,
        title: "Fee Payment",
        desc: "View dues and payment history.",
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
