"use client";

// app/(portal)/teacher/plans/page.tsx — AI year/term lesson plans: generate
// an editable week grid, mark weeks done, activate.

import * as React from "react";
import { motion } from "motion/react";
import { FaBookOpen, FaPlus, FaSpinner, FaRefresh } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { api, RequestError } from "@/lib/api";

interface ClassOption { id: string; name: string; subjects: { subject: { id: string; name: string } }[] }
interface PlanWeek { week: number; startAt: string; topics: string[]; objective: string; assessment: string | null; status: string }
interface Plan { id: string; title: string; type: string; status: string; weeks: PlanWeek[]; class: { name: string }; subject: { name: string } }

export default function TeacherPlansPage() {
    const [classes, setClasses] = React.useState<ClassOption[]>([]);
    const [plans, setPlans] = React.useState<Plan[]>([]);
    const [loading, setLoading] = React.useState(true);

    const [open, setOpen] = React.useState(false);
    const [classId, setClassId] = React.useState<string | null>(null);
    const [subjectId, setSubjectId] = React.useState<string | null>(null);
    const [type, setType] = React.useState<"YEAR" | "TERM">("TERM");
    const [weeks, setWeeks] = React.useState("12");
    const [startDate, setStartDate] = React.useState(new Date().toISOString().slice(0, 10));
    const [busy, setBusy] = React.useState(false);
    const [feedback, setFeedback] = React.useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    const selectedClass = classes.find((c) => c.id === classId);

    const load = React.useCallback(() => {
        api<Plan[]>("/ai/plans")
            .then((p) => setPlans(p))
            .catch(() => setPlans([]))
            .finally(() => setLoading(false));
    }, []);

    React.useEffect(() => {
        api<{ classes: ClassOption[] }>("/classes")
            .then((p) => { setClasses(p.classes); if (p.classes.length > 0) setClassId(p.classes[0].id); })
            .catch(() => setClasses([]));
        load();
    }, [load]);

    async function generate() {
        setBusy(true);
        setFeedback(null);
        try {
            await api("/ai/plans/generate", {
                method: "POST",
                body: { classId, subjectId, type, startDate, weeks: Number(weeks) },
            });
            setFeedback({ kind: "ok", msg: "Plan generated" });
            setOpen(false);
            load();
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Generate failed" });
        } finally {
            setBusy(false);
        }
    }

    async function toggleWeek(plan: Plan, weekNo: number) {
        const week = plan.weeks.find((w) => w.week === weekNo);
        const next = week?.status === "DONE" ? "PLANNED" : "DONE";
        await api(`/ai/plans/${plan.id}/weeks/${weekNo}/status`, { method: "PATCH", body: { status: next } });
        load();
    }

    async function activate(plan: Plan) {
        await api(`/ai/plans/${plan.id}`, { method: "PATCH", body: { status: "ACTIVE" } });
        load();
    }

    if (loading) return <div className="space-y-6"><PageHeader title="Lesson Plans" icon={FaBookOpen} /><Skeleton className="h-32" /></div>;

    return (
        <div className="space-y-6">
            <PageHeader title="Lesson Plans" subtitle="AI-generated year/term plans you can edit" icon={FaBookOpen}
                actions={
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button className="font-black text-xs uppercase tracking-wider"><FaPlus size={12} /> Generate Plan</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader><DialogTitle className="font-black uppercase tracking-tight">Generate Plan (AI)</DialogTitle></DialogHeader>
                            <div className="space-y-4">
                                <Select value={classId ?? undefined} onValueChange={(v) => { setClassId(v); setSubjectId(null); }}>
                                    <SelectTrigger className="h-11"><SelectValue placeholder="Class" /></SelectTrigger>
                                    <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <Select value={subjectId ?? undefined} onValueChange={setSubjectId}>
                                    <SelectTrigger className="h-11"><SelectValue placeholder="Subject" /></SelectTrigger>
                                    <SelectContent>{selectedClass?.subjects.map((cs) => <SelectItem key={cs.subject.id} value={cs.subject.id}>{cs.subject.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <div className="grid grid-cols-3 gap-3">
                                    <Select value={type} onValueChange={(v) => setType(v as "YEAR" | "TERM")}>
                                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="TERM">Term</SelectItem><SelectItem value="YEAR">Year</SelectItem></SelectContent>
                                    </Select>
                                    <Input type="number" min={1} max={52} value={weeks} onChange={(e) => setWeeks(e.target.value)} className="h-11" placeholder="Weeks" />
                                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-11" />
                                </div>
                                <Button onClick={generate} disabled={busy || !subjectId} className="w-full h-11 font-black text-xs uppercase tracking-wider">
                                    {busy ? <><FaSpinner className="animate-spin" size={12} /> Generating…</> : "Generate with AI"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                } />

            {feedback ? (
                <div className={`p-4 text-xs font-bold text-center uppercase tracking-wide rounded-xl shadow-sm border ${feedback.kind === "ok" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                    {feedback.msg}
                </div>
            ) : null}

            {plans.length === 0 ? (
                <EmptyState title="No plans yet" description="Generate your first AI lesson plan." />
            ) : (
                plans.map((plan) => {
                    const done = plan.weeks.filter((w) => w.status === "DONE").length;
                    const pct = plan.weeks.length ? Math.round((done / plan.weeks.length) * 100) : 0;
                    return (
                        <motion.div key={plan.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                            <Card className="border-border/60 shadow-sm">
                                <CardHeader className="border-b border-border/60 pb-4 flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-lg font-black uppercase tracking-tight">{plan.title}</CardTitle>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mt-1">
                                            {plan.class.name} · {plan.subject.name} · {plan.type}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge className={plan.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"}>
                                            {plan.status}
                                        </Badge>
                                        {plan.status !== "ACTIVE" && (
                                            <Button size="sm" onClick={() => activate(plan)} className="font-black text-[10px] uppercase tracking-wider">Activate</Button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Progress value={pct} className="flex-1" />
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{done}/{plan.weeks.length} weeks</span>
                                    </div>
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {plan.weeks.map((w) => (
                                            <div key={w.week} className={`flex items-start gap-3 p-3 rounded-lg border ${w.status === "DONE" ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/60"}`}>
                                                <input type="checkbox" checked={w.status === "DONE"} onChange={() => toggleWeek(plan, w.week)}
                                                    className="mt-1 cursor-pointer" />
                                                <div className="flex-1">
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Week {w.week} · {w.startAt}</p>
                                                    <p className="text-sm font-semibold">{w.topics.join(", ")}</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">{w.objective}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })
            )}
        </div>
    );
}
