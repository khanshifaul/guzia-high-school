// components/portal/role-nav.ts — sidebar navigation per role.

import type { IconType } from "react-icons";
import {
    FaGaugeHigh,
    FaUsers,
    FaChalkboardUser,
    FaLayerGroup,
    FaUserCheck,
    FaGraduationCap,
    FaMoneyBillWave,
    FaBullhorn,
    FaBrain,
    FaGear,
    FaCalendarDays,
    FaListCheck,
    FaFileLines,
    FaFolderOpen,
    FaImages,
    FaFilePen,
} from "react-icons/fa6";

export interface NavItem {
    label: string;
    href: string;
    icon: IconType;
}

export interface NavSection {
    title: string;
    items: NavItem[];
}

export const ADMIN_NAV: NavSection[] = [
    {
        title: "Overview",
        items: [{ label: "Dashboard", href: "/admin", icon: FaGaugeHigh }],
    },
    {
        title: "People",
        items: [
            { label: "Students", href: "/admin/students", icon: FaUsers },
            { label: "Teachers", href: "/admin/teachers", icon: FaChalkboardUser },
        ],
    },
    {
        title: "Academics",
        items: [
            { label: "Classes", href: "/admin/classes", icon: FaLayerGroup },
            { label: "Admissions", href: "/admin/admissions", icon: FaUserCheck },
            { label: "Grades", href: "/admin/grades", icon: FaGraduationCap },
            { label: "Attendance", href: "/admin/attendance", icon: FaCalendarDays },
        ],
    },
    {
        title: "Finance",
        items: [{ label: "Fees", href: "/admin/fees", icon: FaMoneyBillWave }],
    },
    {
        title: "Communication",
        items: [
            { label: "Notices", href: "/admin/notices", icon: FaBullhorn },
            { label: "Gallery", href: "/admin/gallery", icon: FaImages },
        ],
    },
    {
        title: "AI",
        items: [{ label: "At-Risk Board", href: "/admin/at-risk", icon: FaBrain }],
    },
    {
        title: "System",
        items: [{ label: "Pages", href: "/admin/pages", icon: FaFileLines }, { label: "Settings", href: "/admin/settings", icon: FaGear }],
    },
];

export const TEACHER_NAV: NavSection[] = [
    {
        title: "Overview",
        items: [{ label: "Dashboard", href: "/teacher", icon: FaGaugeHigh }],
    },
    {
        title: "Teaching",
        items: [
            { label: "My Classes", href: "/teacher/classes", icon: FaLayerGroup },
            { label: "Attendance", href: "/teacher/attendance", icon: FaCalendarDays },
            { label: "Grades", href: "/teacher/grades", icon: FaGraduationCap },
            { label: "Assignments", href: "/teacher/assignments", icon: FaListCheck },
        ],
    },
    {
        title: "AI Tools",
        items: [{ label: "Studio", href: "/teacher/studio", icon: FaFolderOpen }],
    },
    {
        title: "Communication",
        items: [{ label: "Notices", href: "/teacher/notices", icon: FaBullhorn }],
    },
];

export const STUDENT_NAV: NavSection[] = [
    {
        title: "Overview",
        items: [{ label: "Dashboard", href: "/student", icon: FaGaugeHigh }],
    },
    {
        title: "My School",
        items: [
            { label: "Attendance", href: "/student/attendance", icon: FaCalendarDays },
            { label: "Grades", href: "/student/grades", icon: FaGraduationCap },
            { label: "Assignments", href: "/student/assignments", icon: FaListCheck },
            { label: "Online Tests", href: "/student/tests", icon: FaFilePen },
            { label: "Admissions", href: "/student/admissions", icon: FaFileLines },
            { label: "Fees", href: "/student/fees", icon: FaMoneyBillWave },
        ],
    },
    {
        title: "Communication",
        items: [{ label: "Notices", href: "/student/notices", icon: FaBullhorn }],
    },
];

export const PARENT_NAV: NavSection[] = [
    {
        title: "Overview",
        items: [{ label: "Dashboard", href: "/parent", icon: FaGaugeHigh }],
    },
    {
        title: "Child",
        items: [
            { label: "Progress", href: "/parent/progress", icon: FaGraduationCap },
            { label: "Attendance", href: "/parent/attendance", icon: FaCalendarDays },
            { label: "Fees", href: "/parent/fees", icon: FaMoneyBillWave },
        ],
    },
    {
        title: "Communication",
        items: [{ label: "Notices", href: "/parent/notices", icon: FaBullhorn }],
    },
];

export const NAV_BY_ROLE = {
    ADMIN: ADMIN_NAV,
    TEACHER: TEACHER_NAV,
    STUDENT: STUDENT_NAV,
    PARENT: PARENT_NAV,
} as const;
