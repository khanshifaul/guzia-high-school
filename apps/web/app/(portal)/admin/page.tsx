"use client";

// app/(portal)/admin/page.tsx — admin dashboard: aggregate stats, pending
// admissions, at-risk mini-board.

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { FaGaugeHigh, FaUsers, FaChalkboardUser, FaUserCheck, FaBrain, FaMoneyBillWave } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { api } from "@/lib/api";

interface RiskRow { studentId: string; fullName: string; className: string; score: number; atRisk: boolean }
interface StudentList { meta: { total: number } }
interface TeacherList { meta: { total: number } }
interface AdmissionList { meta: { total: number } }

export default function AdminDashboard() {
    const [stats, setStats] = React.useState({ students: 0, teachers: 0, admissions: 0 });
    const [risk, setRisk] = React.useState<RiskRow[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        Promise.all([
            api<StudentList>("/students"),
            api<TeacherList>("/teachers"),
            api<AdmissionList>("/admissions?status=SUBMITTED"),
            api<{ rows: RiskRow[] }>("/ai/at-risk?atRisk=true"),
        ])
            .then(([s, t, a, r]) => {
                setStats({ students: s.meta.total, teachers: t.meta.total, admissions: a.meta.total });
                setRisk(r.rows.slice(0, 5));
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="space-y-6"><PageHeader title="Dashboard" icon={FaGaugeHigh} /><div className="grid grid-cols-1 md:grid-cols-4 gap-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div></div>;
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Dashboard" subtitle="School overview at a glance" icon={FaGaugeHigh} />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard value={stats.students} label="Students" />
                <StatCard value={stats.teachers} label="Teachers" />
                <StatCard value={stats.admissions} label="Pending Admissions" hint="Awaiting review" />
                <StatCard value={risk.length} label="At-Risk Students" hint="Flagged by AI" />
            </div>

            <Card className="border-border/60 shadow-sm">
                <CardHeader className="border-b border-border/60 pb-4 flex flex-row items-center justify-between">
                    <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                        <FaBrain className="text-primary" size={16} /> At-Risk Students
                    </CardTitle>
                    <Link href="/admin/at-risk" className="text-[10px] font-black text-primary uppercase tracking-wider hover:underline">
                        View board →
                    </Link>
                </CardHeader>
                <CardContent className="p-6">
                    {risk.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No students flagged. Run a recompute from the At-Risk Board.</p>
                    ) : (
                        <div className="space-y-3">
                            {risk.map((r) => (
                                <motion.div key={r.studentId} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center justify-between bg-card border border-border/60 rounded-xl p-4">
                                    <div>
                                        <p className="text-sm font-bold">{r.fullName}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{r.className}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                                            <div className="h-full bg-rose-500" style={{ width: `${Math.round(r.score * 100)}%` }} />
                                        </div>
                                        <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20">{(r.score * 100).toFixed(0)}%</Badge>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/admin/students" className="hover:scale-[1.01] transition-transform">
                    <Card className="border-border/60 shadow-sm cursor-pointer"><CardContent className="p-5 flex items-center gap-3">
                        <FaUsers className="text-primary" size={20} /><div><p className="text-sm font-bold">Manage Students</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Directory & admissions</p></div>
                    </CardContent></Card>
                </Link>
                <Link href="/admin/admissions" className="hover:scale-[1.01] transition-transform">
                    <Card className="border-border/60 shadow-sm cursor-pointer"><CardContent className="p-5 flex items-center gap-3">
                        <FaUserCheck className="text-primary" size={20} /><div><p className="text-sm font-bold">Admissions Queue</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Approve & enroll</p></div>
                        {stats.admissions > 0 ? <Badge className="ml-auto bg-primary/10 text-primary border-primary/20">{stats.admissions}</Badge> : null}
                    </CardContent></Card>
                </Link>
                <Link href="/admin/fees" className="hover:scale-[1.01] transition-transform">
                    <Card className="border-border/60 shadow-sm cursor-pointer"><CardContent className="p-5 flex items-center gap-3">
                        <FaMoneyBillWave className="text-primary" size={20} /><div><p className="text-sm font-bold">Fees & Payments</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Invoices & waterfall</p></div>
                    </CardContent></Card>
                </Link>
                <Link href="/admin/teachers" className="hover:scale-[1.01] transition-transform">
                    <Card className="border-border/60 shadow-sm cursor-pointer"><CardContent className="p-5 flex items-center gap-3">
                        <FaChalkboardUser className="text-primary" size={20} /><div><p className="text-sm font-bold">Manage Teachers</p><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Staff directory</p></div>
                    </CardContent></Card>
                </Link>
            </div>
        </div>
    );
}
