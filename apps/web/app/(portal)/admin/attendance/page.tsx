"use client";

// app/(portal)/admin/attendance/page.tsx — view a section's attendance for a
// date (matrix read-only; teachers mark).

import * as React from "react";
import { FaCalendarCheck } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { api } from "@/lib/api";

interface Section { id: string; name: string; class: { id: string; name: string } }
interface Row { studentId: string; rollNo: number; fullName: string; status: "PRESENT" | "ABSENT" | "LATE" | null }

const STATUS_BADGE: Record<string, string> = {
    PRESENT: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    LATE: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    ABSENT: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

export default function AdminAttendancePage() {
    const today = new Date().toISOString().slice(0, 10);
    const [sections, setSections] = React.useState<Section[]>([]);
    const [sectionId, setSectionId] = React.useState<string | null>(null);
    const [date, setDate] = React.useState(today);
    const [rows, setRows] = React.useState<Row[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [loadingRows, setLoadingRows] = React.useState(false);

    React.useEffect(() => {
        api<{ classes: { id: string; name: string; sections: { id: string; name: string }[] }[] }>("/classes")
            .then((p) => {
                const flat = p.classes.flatMap((c) => c.sections.map((s) => ({ id: s.id, name: s.name, class: { id: c.id, name: c.name } })));
                setSections(flat);
                if (flat.length > 0) setSectionId(flat[0].id);
            })
            .catch(() => setSections([]))
            .finally(() => setLoading(false));
    }, []);

    React.useEffect(() => {
        if (!sectionId) return;
        setLoadingRows(true);
        api<{ records: Row[] }>(`/attendance/section/${sectionId}?date=${date}`)
            .then((p) => setRows(p.records))
            .catch(() => setRows([]))
            .finally(() => setLoadingRows(false));
    }, [sectionId, date]);

    if (loading) return <div className="space-y-6"><PageHeader title="Attendance" icon={FaCalendarCheck} /><Skeleton className="h-32" /></div>;

    const section = sections.find((s) => s.id === sectionId);

    return (
        <div className="space-y-6">
            <PageHeader title="Attendance" subtitle="View a section's record for a date" icon={FaCalendarCheck} />

            <Card className="border-border/60 shadow-sm">
                <CardContent className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Section</label>
                        <Select value={sectionId ?? undefined} onValueChange={setSectionId}>
                            <SelectTrigger className="h-11 text-xs font-semibold"><SelectValue placeholder="Select section" /></SelectTrigger>
                            <SelectContent>
                                {sections.map((s) => (<SelectItem key={s.id} value={s.id}>{s.class.name} — {s.name}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Date</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                            className="w-full h-11 px-3 border border-input rounded-lg bg-card text-sm" />
                    </div>
                </CardContent>
            </Card>

            {loadingRows ? (
                <Skeleton className="h-64" />
            ) : rows.length === 0 ? (
                <EmptyState title="No records" description="No attendance marked for this section/date." />
            ) : (
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="border-b border-border/60 pb-4">
                        <CardTitle className="text-lg font-black uppercase tracking-tight">
                            {section ? `${section.class.name} — ${section.name}` : ""} · {new Date(date).toLocaleDateString()}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 divide-y divide-border/60">
                        {rows.map((r) => (
                            <div key={r.studentId} className="flex items-center justify-between px-6 py-3">
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="text-[10px] font-black">{r.rollNo}</Badge>
                                    <span className="text-sm font-semibold">{r.fullName}</span>
                                </div>
                                <Badge className={r.status ? STATUS_BADGE[r.status] : "bg-muted text-muted-foreground border-border"}>
                                    {r.status ?? "Not marked"}
                                </Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
