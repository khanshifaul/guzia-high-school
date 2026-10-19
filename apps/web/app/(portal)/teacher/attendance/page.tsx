"use client";

// app/(portal)/teacher/attendance/page.tsx — mark a section for a date.
// Fast P/A/L segmented buttons + "mark all present" + submit (idempotent upsert).

import * as React from "react";
import { FaCalendarCheck, FaCheck, FaSpinner } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { api, RequestError } from "@/lib/api";
import { useMyTeacher } from "@/lib/teacher-session";
interface Section { id: string; name: string; class: { id: string; name: string } }
interface RosterRow { studentId: string; rollNo: number; fullName: string; status: "PRESENT" | "ABSENT" | "LATE" | null }
type Status = "PRESENT" | "ABSENT" | "LATE";

const STATUS_BTN: Record<Status, string> = {
    PRESENT: "bg-emerald-500 text-white",
    LATE: "bg-amber-500 text-white",
    ABSENT: "bg-rose-500 text-white",
};

export default function TeacherAttendancePage() {
    const { teacherId } = useMyTeacher();
    const today = new Date().toLocaleDateString('en-CA');
    const [sections, setSections] = React.useState<Section[]>([]);
    const [sectionId, setSectionId] = React.useState<string | null>(null);
    const [date, setDate] = React.useState(today);
    const [roster, setRoster] = React.useState<RosterRow[]>([]);
    const [loadingSections, setLoadingSections] = React.useState(true);
    const [loadingRoster, setLoadingRoster] = React.useState(false);
    const [busy, setBusy] = React.useState(false);
    const [feedback, setFeedback] = React.useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    React.useEffect(() => {
        let cancelled = false;
        api<{
            classes: {
                id: string;
                name: string;
                sections: { id: string; name: string }[];
                subjects: { section: { id: string }; teacher: { id: string } | null }[];
            }[];
        }>("/classes")
            .then((p) => {
                if (cancelled) return;
                const teacherSections = new Set<string>();
                p.classes.forEach((c) => {
                    c.subjects.forEach((cs) => {
                        if (cs.teacher?.id === teacherId) teacherSections.add(cs.section.id);
                    });
                });
                const flat = p.classes.flatMap((c) =>
                    c.sections.map((s) => ({ id: s.id, name: s.name, class: { id: c.id, name: c.name } })),
                );
                const mine = flat.filter((s) => teacherSections.has(s.id));
                setSections(mine.length > 0 ? mine : flat);
                if (mine.length > 0) setSectionId(mine[0].id);
                else if (flat.length > 0) setSectionId(flat[0].id);
            })
            .catch(() => {
                if (!cancelled) setSections([]);
            })
            .finally(() => {
                if (!cancelled) setLoadingSections(false);
            });
        return () => {
            cancelled = true;
        };
    }, [teacherId]);

    React.useEffect(() => {
        if (!sectionId) return;
        setLoadingRoster(true);
        api<{ records: RosterRow[] }>(`/attendance/section/${sectionId}?date=${date}`)
            .then((p) => setRoster(p.records))
            .catch(() => setRoster([]))
            .finally(() => setLoadingRoster(false));
    }, [sectionId, date]);

    function setStatus(studentId: string, status: Status) {
        setRoster((r) => r.map((row) => (row.studentId === studentId ? { ...row, status } : row)));
    }

    function markAllPresent() {
        setRoster((r) => r.map((row) => ({ ...row, status: "PRESENT" as Status })));
    }

    async function submit() {
        setBusy(true);
        setFeedback(null);
        try {
            const records = roster
                .filter((r) => r.status)
                .map((r) => ({ studentId: r.studentId, status: r.status as Status }));
            if (records.length === 0) {
                setFeedback({ kind: "err", msg: "Set a status for at least one student" });
                return;
            }
            await api("/attendance/mark", { method: "POST", body: { sectionId, date, records } });
            setFeedback({ kind: "ok", msg: `Marked ${records.length} students` });
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Mark failed" });
        } finally {
            setBusy(false);
        }
    }

    const section = sections.find((s) => s.id === sectionId);

    return (
        <div className="space-y-6">
            <PageHeader title="Mark Attendance" subtitle="Set a status per student, then submit" icon={FaCalendarCheck}
                actions={
                    <Button onClick={markAllPresent} variant="outline" className="font-black text-xs uppercase tracking-wider">
                        <FaCheck size={12} /> Mark All Present
                    </Button>
                } />

            <Card className="border-border/60 shadow-sm">
                <CardContent className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Section</label>
                        <Select value={sectionId ?? undefined} onValueChange={setSectionId}>
                            <SelectTrigger className="h-11 text-xs font-semibold"><SelectValue placeholder="Select section" /></SelectTrigger>
                            <SelectContent>
                                {sections.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>{s.class.name} — {s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Date</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                            className="w-full h-11 px-3 border border-input rounded-lg bg-card text-sm" />
                    </div>
                    <div className="flex items-end">
                        <Button onClick={submit} disabled={busy || !sectionId || roster.length === 0}
                            className="w-full h-11 font-black text-xs uppercase tracking-wider">
                            {busy ? <><FaSpinner className="animate-spin" size={12} /> Saving…</> : "Submit Attendance"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {feedback ? (
                <div className={`p-4 text-xs font-bold text-center uppercase tracking-wide rounded-xl shadow-sm border ${feedback.kind === "ok" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                    {feedback.msg}
                </div>
            ) : null}

            {loadingSections || loadingRoster ? (
                <Skeleton className="h-64" />
            ) : roster.length === 0 ? (
                <EmptyState title="No students" description={section ? `No students in ${section.class.name} — ${section.name}` : "Select a section"} />
            ) : (
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="border-b border-border/60 pb-4">
                        <CardTitle className="text-lg font-black uppercase tracking-tight">
                            {section ? `${section.class.name} — ${section.name}` : ""} · {roster.length} students
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 divide-y divide-border/60">
                        {roster.map((row) => (
                            <div key={row.studentId} className="flex items-center justify-between px-6 py-3">
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="text-[10px] font-black">{row.rollNo}</Badge>
                                    <span className="text-sm font-semibold">{row.fullName}</span>
                                </div>
                                <div className="flex gap-1.5">
                                    {(["PRESENT", "LATE", "ABSENT"] as Status[]).map((s) => (
                                        <button key={s} onClick={() => setStatus(row.studentId, s)}
                                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${row.status === s ? STATUS_BTN[s] : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                                            {s === "PRESENT" ? "P" : s === "LATE" ? "L" : "A"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
