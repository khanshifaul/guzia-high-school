"use client";

// app/(portal)/teacher/page.tsx — teacher dashboard: the teacher's "today".
//
// Spec 06 asks for my classes, today's unmarked attendance sections and
// assignments awaiting grading; spec 10 adds the plan's syllabus progress
// ("Math 8 syllabus 42%"). All four come from one summary request so the
// page does not fan out into a request per card.

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
    FaGaugeHigh,
    FaChalkboardUser,
    FaCalendarCheck,
    FaGraduationCap,
    FaListCheck,
    FaBookOpen,
    FaClipboardList,
    FaFolderOpen,
    FaBullhorn,
    FaExclamation,
} from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { NoticesList } from "@/components/shared/notices-list";
import { api } from "@/lib/api";
import { useMyTeacher } from "@/lib/teacher-session";

interface DashboardSection {
    id: string;
    name: string;
    classId: string;
    className: string;
    studentCount: number;
    attendancePending: boolean;
}

interface DashboardAssignment {
    id: string;
    title: string;
    className: string;
    subjectName: string;
    dueDate: string;
    submittedCount: number;
    awaitingGradingCount: number;
}

interface DashboardPlan {
    id: string;
    title: string;
    className: string;
    subjectName: string;
    doneWeeks: number;
    totalWeeks: number;
    pct: number;
}

interface TeacherDashboard {
    sections: DashboardSection[];
    assignmentsAwaitingGrading: DashboardAssignment[];
    plans: DashboardPlan[];
}

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
    const [data, setData] = React.useState<TeacherDashboard | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        api<TeacherDashboard>("/teacher/dashboard")
            .then((d) => setData(d))
            .catch(() => setData({ sections: [], assignmentsAwaitingGrading: [], plans: [] }))
            .finally(() => setLoading(false));
    }, []);

    const pendingSections = data?.sections.filter((s) => s.attendancePending) ?? [];
    const awaiting = data?.assignmentsAwaitingGrading ?? [];

    if (loading) {
        return (
            <div className="space-y-6">
                <PageHeader title="Dashboard" icon={FaGaugeHigh} />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Dashboard" subtitle={`Welcome back${fullName ? `, ${fullName}` : ""}`} icon={FaGaugeHigh} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard value={data?.sections.length ?? 0} label="My Sections" hint="Classes you teach" />
                <StatCard
                    value={pendingSections.length}
                    label="Attendance Due"
                    hint={pendingSections.length ? "Not marked today" : "All marked today"}
                />
                <StatCard
                    value={awaiting.reduce((n, a) => n + a.awaitingGradingCount, 0)}
                    label="Submissions To Grade"
                    hint={awaiting.length ? `${awaiting.length} assignment(s)` : "Nothing waiting"}
                />
                <StatCard
                    value={data?.plans.length ?? 0}
                    label="Lesson Plans"
                    hint={data?.plans.length ? "Year / term plans" : "None yet"}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="border-b border-border/60 pb-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-lg font-black uppercase tracking-tight">Today&apos;s attendance</CardTitle>
                        <Link href="/teacher/attendance">
                            <Button variant="outline" size="sm" className="font-black text-[10px] uppercase tracking-wider cursor-pointer">
                                Mark attendance
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent className="p-6">
                        {(data?.sections.length ?? 0) === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                You are not assigned to any section yet. An admin assigns subjects to teachers from Classes.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {data?.sections.map((s) => (
                                    <div
                                        key={s.id}
                                        className={`flex items-center justify-between rounded-xl border p-3 ${
                                            s.attendancePending
                                                ? "border-warning/40 bg-warning/5"
                                                : "border-emerald-500/30 bg-emerald-500/5"
                                        }`}
                                    >
                                        <div>
                                            <p className="text-sm font-bold">
                                                {s.className} — {s.name}
                                            </p>
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                                                {s.studentCount} student{s.studentCount === 1 ? "" : "s"}
                                            </p>
                                        </div>
                                        <Badge
                                            className={
                                                s.attendancePending
                                                    ? "bg-warning/10 text-warning border-warning/20"
                                                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                            }
                                        >
                                            {s.attendancePending ? "Not marked" : "Marked"}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="border-b border-border/60 pb-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-lg font-black uppercase tracking-tight">Awaiting grading</CardTitle>
                        <Link href="/teacher/assignments">
                            <Button variant="outline" size="sm" className="font-black text-[10px] uppercase tracking-wider cursor-pointer">
                                All assignments
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent className="p-6">
                        {awaiting.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nothing to grade — every submission has a score.</p>
                        ) : (
                            <div className="space-y-2">
                                {awaiting.map((a) => (
                                    <div key={a.id} className="flex items-center justify-between rounded-xl border border-border/60 p-3">
                                        <div>
                                            <p className="text-sm font-bold">{a.title}</p>
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                                                {a.className} · {a.subjectName} · due {a.dueDate}
                                            </p>
                                        </div>
                                        <Badge className="bg-primary/10 text-primary border-primary/20">
                                            {a.awaitingGradingCount} of {a.submittedCount}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className="border-border/60 shadow-sm">
                <CardHeader className="border-b border-border/60 pb-4 flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-black uppercase tracking-tight">Syllabus progress</CardTitle>
                    <Link href="/teacher/plans">
                        <Button variant="outline" size="sm" className="font-black text-[10px] uppercase tracking-wider cursor-pointer">
                            All plans
                        </Button>
                    </Link>
                </CardHeader>
                <CardContent className="p-6">
                    {(data?.plans.length ?? 0) === 0 ? (
                        <EmptyState title="No lesson plans yet" description="Generate a plan to track syllabus progress." />
                    ) : (
                        <div className="space-y-4">
                            {data?.plans.map((p) => (
                                <Link key={p.id} href={`/teacher/plans/${p.id}`} className="block">
                                    <div className="rounded-xl border border-border/60 p-4 hover:border-primary/30 transition-colors">
                                        <div className="flex items-center justify-between gap-3 mb-2">
                                            <div>
                                                <p className="text-sm font-bold">{p.title}</p>
                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                                                    {p.className} · {p.subjectName}
                                                </p>
                                            </div>
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                                                {p.doneWeeks}/{p.totalWeeks} weeks · {p.pct}%
                                            </span>
                                        </div>
                                        <Progress value={p.pct} />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

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

            <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
                <FaExclamation size={12} className="mt-0.5 shrink-0 text-warning" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                    AI-generated plans are a draft — verify the week order and topics against your textbook before teaching.
                </p>
            </div>

            <NoticesList title="Recent Notices" limit={5} />
        </div>
    );
}
