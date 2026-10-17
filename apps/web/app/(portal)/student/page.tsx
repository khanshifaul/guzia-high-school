"use client";

// app/(portal)/student/page.tsx — student dashboard: attendance %, CGPA,
// pending fees, and recent notices.

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { FaGaugeHigh, FaCalendarCheck, FaGraduationCap, FaMoneyBillWave, FaBullhorn } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { api, RequestError } from "@/lib/api";
import { useMyStudent } from "@/lib/student-session";

interface AttendanceResp { attendancePct: number; total: number }
interface ResultsResp { cgpa: number; exams: unknown[] }
interface LedgerResp { totalDue: number }
interface Notice { id: string; title: string; body: string; createdAt: string; audience: string | null }

export default function StudentDashboard() {
    const { studentId, loading: loadingMe } = useMyStudent();
    const [attendance, setAttendance] = React.useState<AttendanceResp | null>(null);
    const [results, setResults] = React.useState<ResultsResp | null>(null);
    const [ledger, setLedger] = React.useState<LedgerResp | null>(null);
    const [notices, setNotices] = React.useState<Notice[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!studentId) return;
        let cancelled = false;
        setLoading(true);
        Promise.all([
            api<{ data: AttendanceResp }>(`/attendance/student/${studentId}`),
            api<{ data: ResultsResp }>(`/exams/results/student/${studentId}`),
            api<{ data: LedgerResp }>(`/fees/ledger/${studentId}`),
            api<{ data: Notice[] }>("/notices"),
        ])
            .then(([att, res, led, not]) => {
                if (cancelled) return;
                setAttendance(att.data);
                setResults(res.data);
                setLedger(led.data);
                setNotices(not.data.slice(0, 5));
                setError(null);
            })
            .catch((err) => {
                if (!cancelled) setError(err instanceof RequestError ? err.messages.join("; ") : "Failed to load dashboard");
            })
            .finally(() => !cancelled && setLoading(false));
        return () => { cancelled = true; };
    }, [studentId]);

    if (loadingMe || loading) {
        return (
            <div className="space-y-6">
                <PageHeader title="Dashboard" icon={FaGaugeHigh} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" />
                </div>
                <Skeleton className="h-40" />
            </div>
        );
    }

    if (!studentId) {
        return <EmptyState title="No student profile" description="Your account is not linked to a student record." />;
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Dashboard" subtitle="Your academic snapshot at a glance" icon={FaGaugeHigh} />

            {error ? (
                <div className="p-4 text-xs font-bold text-center uppercase tracking-wide rounded-xl shadow-sm border bg-destructive/10 text-destructive border-destructive/20">
                    {error}
                </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard value={attendance ? `${attendance.attendancePct}%` : "—"} label="Attendance" hint={attendance ? `${attendance.total} days recorded` : undefined} />
                <StatCard value={results ? results.cgpa.toFixed(2) : "—"} label="CGPA" hint="Published exams" />
                <StatCard value={ledger ? `৳${ledger.totalDue}` : "—"} label="Pending Fees" />
            </div>

            <Card className="border-border/60 shadow-sm">
                <CardHeader className="border-b border-border/60 pb-4">
                    <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                        <FaBullhorn className="text-primary" size={16} /> Recent Notices
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    {notices.length === 0 ? (
                        <EmptyState title="No notices" description="Announcements will appear here." />
                    ) : (
                        <div className="space-y-3">
                            {notices.map((n) => (
                                <motion.div key={n.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                    className="bg-card border border-border/60 rounded-xl p-4 hover:border-primary/20 transition-all">
                                    <p className="text-sm font-bold">{n.title}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{n.body}</p>
                                    <p className="text-[10px] text-muted-foreground mt-2">{new Date(n.createdAt).toLocaleDateString()}</p>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/student/attendance" className="hover:scale-[1.01] transition-transform">
                    <Card className="border-border/60 shadow-sm cursor-pointer"><CardContent className="p-5 flex items-center gap-3">
                        <FaCalendarCheck className="text-primary" size={20} /><div><p className="text-sm font-bold">Attendance</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">View your calendar</p></div>
                    </CardContent></Card>
                </Link>
                <Link href="/student/grades" className="hover:scale-[1.01] transition-transform">
                    <Card className="border-border/60 shadow-sm cursor-pointer"><CardContent className="p-5 flex items-center gap-3">
                        <FaGraduationCap className="text-primary" size={20} /><div><p className="text-sm font-bold">Grades</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Results & CGPA</p></div>
                    </CardContent></Card>
                </Link>
                <Link href="/student/fees" className="hover:scale-[1.01] transition-transform">
                    <Card className="border-border/60 shadow-sm cursor-pointer"><CardContent className="p-5 flex items-center gap-3">
                        <FaMoneyBillWave className="text-primary" size={20} /><div><p className="text-sm font-bold">Fees</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ledger & payments</p></div>
                    </CardContent></Card>
                </Link>
            </div>
        </div>
    );
}
