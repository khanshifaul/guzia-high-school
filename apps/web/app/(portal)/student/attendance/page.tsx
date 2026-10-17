"use client";

// app/(portal)/student/attendance/page.tsx — weighted attendance % + a
// month calendar heat-view (specs/06 rule #2 surfaced in the UI).

import * as React from "react";
import { FaCalendarCheck } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { api } from "@/lib/api";
import { useMyStudent } from "@/lib/student-session";

interface AttendanceRecord { date: string; status: "PRESENT" | "ABSENT" | "LATE" }
interface AttendanceResp { records: AttendanceRecord[]; attendancePct: number; total: number }

const STATUS_COLOR: Record<string, string> = {
    PRESENT: "bg-emerald-500 text-white",
    LATE: "bg-amber-500 text-white",
    ABSENT: "bg-rose-500 text-white",
};

export default function StudentAttendancePage() {
    const { studentId, loading: loadingMe } = useMyStudent();
    const [data, setData] = React.useState<AttendanceResp | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (!studentId) return;
        api<{ data: AttendanceResp }>(`/attendance/student/${studentId}`)
            .then((p) => setData(p.data))
            .catch(() => setData({ records: [], attendancePct: 0, total: 0 }))
            .finally(() => setLoading(false));
    }, [studentId]);

    if (loadingMe || loading) {
        return <div className="space-y-6"><PageHeader title="Attendance" icon={FaCalendarCheck} /><Skeleton className="h-28" /><Skeleton className="h-96" /></div>;
    }
    if (!studentId) return <EmptyState title="No student profile" description="Your account is not linked to a student record." />;

    // Build a date→status map for quick lookup.
    const byDate = new Map<string, string>();
    for (const r of data?.records ?? []) byDate.set(r.date.slice(0, 10), r.status);

    // Render the last ~35 days as a simple heat grid.
    const days: { date: string; status?: string }[] = [];
    for (let i = 34; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const key = d.toISOString().slice(0, 10);
        days.push({ date: key, status: byDate.get(key) });
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Attendance" subtitle="Weighted: present = 1, late = 0.5" icon={FaCalendarCheck} />

            <Card className="border-border/60 shadow-sm">
                <CardContent className="p-6">
                    <p className="text-4xl font-black text-primary">{data?.attendancePct ?? 0}%</p>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mt-1">
                        Overall · {data?.total ?? 0} days recorded
                    </p>
                </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
                <CardHeader className="border-b border-border/60 pb-4">
                    <CardTitle className="text-xl font-black uppercase tracking-tight">Last 35 Days</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-7 gap-2">
                        {days.map((d) => (
                            <div key={d.date}
                                className={`aspect-square rounded-lg flex items-center justify-center text-[9px] font-black ${d.status ? STATUS_COLOR[d.status] : "bg-muted text-muted-foreground"}`}
                                title={`${d.date}${d.status ? ` — ${d.status}` : " — no record"}`}>
                                {Number(d.date.slice(8, 10))}
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-4 mt-4 text-[10px] font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500" /> Present</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500" /> Late</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-500" /> Absent</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
