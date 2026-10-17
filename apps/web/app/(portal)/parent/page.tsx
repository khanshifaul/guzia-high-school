"use client";

// app/(portal)/parent/page.tsx — parent dashboard: child selector + the
// selected child's attendance %, CGPA, pending fees.

import * as React from "react";
import { FaGaugeHigh } from "react-icons/fa6";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { NoticesList } from "@/components/shared/notices-list";
import { api } from "@/lib/api";
import { ChildSelector, useMyChildren } from "./_components/child-selector";

interface Stats { attendancePct: number; cgpa: number; totalDue: number }

export default function ParentDashboard() {
    const { children, loading, selected, setSelected } = useMyChildren();
    const [stats, setStats] = React.useState<Stats | null>(null);
    const [loadingStats, setLoadingStats] = React.useState(false);

    React.useEffect(() => {
        if (!selected) return;
        setLoadingStats(true);
        api<{ data: { stats: Stats } }>(`/students/${selected}`)
            .then((p) => setStats(p.data.stats))
            .catch(() => setStats(null))
            .finally(() => setLoadingStats(false));
    }, [selected]);

    return (
        <div className="space-y-6">
            <PageHeader title="Dashboard" subtitle="Your child's academic snapshot" icon={FaGaugeHigh} />
            <ChildSelector children={children} loading={loading} selected={selected} onChange={setSelected} />

            {loading || loadingStats ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" />
                </div>
            ) : selected && stats ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard value={`${stats.attendancePct}%`} label="Attendance" />
                    <StatCard value={stats.cgpa.toFixed(2)} label="CGPA" />
                    <StatCard value={`৳${stats.totalDue}`} label="Pending Fees" />
                </div>
            ) : null}

            <NoticesList title="Recent Notices" limit={5} />
        </div>
    );
}
