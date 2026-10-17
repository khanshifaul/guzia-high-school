"use client";

// app/(portal)/teacher/page.tsx — teacher dashboard: quick links to classes,
// attendance marking, grading, and AI tools.

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { FaGaugeHigh, FaChalkboardUser, FaCalendarCheck, FaGraduationCap, FaListCheck, FaBookOpen, FaClipboardList, FaFolderOpen, FaBullhorn } from "react-icons/fa6";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { NoticesList } from "@/components/shared/notices-list";
import { useMyTeacher } from "@/lib/teacher-session";

const LINKS = [
    { label: "My Classes", href: "/teacher/classes", icon: FaChalkboardUser, desc: "Rosters & subjects" },
    { label: "Mark Attendance", href: "/teacher/attendance", icon: FaCalendarCheck, desc: "Present / Late / Absent" },
    { label: "Enter Grades", href: "/teacher/grades", icon: FaGraduationCap, desc: "Exam marks entry" },
    { label: "Assignments", href: "/teacher/assignments", icon: FaListCheck, desc: "Create & grade work" },
    { label: "Lesson Plans", href: "/teacher/plans", icon: FaBookOpen, desc: "AI year/term plans" },
    { label: "Test Papers", href: "/teacher/tests", icon: FaClipboardList, desc: "AI question papers" },
    { label: "Sources", href: "/teacher/sources", icon: FaFolderOpen, desc: "Upload & ask AI" },
    { label: "Notices", href: "/teacher/notices", icon: FaBullhorn, desc: "Post announcements" },
];

export default function TeacherDashboard() {
    const { fullName } = useMyTeacher();

    return (
        <div className="space-y-6">
            <PageHeader title="Dashboard" subtitle={`Welcome back${fullName ? `, ${fullName}` : ""}`} icon={FaGaugeHigh} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {LINKS.map((l, i) => {
                    const Icon = l.icon;
                    return (
                        <motion.div key={l.href} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                            <Link href={l.href}>
                                <Card className="border-border/60 shadow-sm cursor-pointer hover:border-primary/20 hover:scale-[1.01] transition-all h-full">
                                    <CardContent className="p-5">
                                        <Icon className="text-primary" size={22} />
                                        <p className="text-sm font-bold mt-3">{l.label}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{l.desc}</p>
                                    </CardContent>
                                </Card>
                            </Link>
                        </motion.div>
                    );
                })}
            </div>

            <NoticesList title="Recent Notices" limit={5} />
        </div>
    );
}
