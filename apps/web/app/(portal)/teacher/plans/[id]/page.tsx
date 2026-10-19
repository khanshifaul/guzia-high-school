"use client";

// app/(portal)/teacher/plans/[id]/page.tsx — one lesson plan on its own page:
// the editable week grid, the progress tracker, activation, and per-week AI
// regeneration.

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FaBookOpen, FaSpinner, FaArrowLeft, FaRotate, FaCheck, FaFloppyDisk, FaExclamation } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page-header";
import { api, RequestError } from "@/lib/api";

interface PlanWeek {
    week: number;
    startAt: string;
    topics: string[];
    objective: string;
    assessment: string | null;
    status: string;
}

interface Plan {
    id: string;
    title: string;
    type: string;
    status: string;
    startDate: string;
    weeks: PlanWeek[];
    class: { name: string };
    subject: { name: string };
}

export default function PlanDetailPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const planId = params?.id as string;

    const [plan, setPlan] = React.useState<Plan | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [busyWeek, setBusyWeek] = React.useState<number | null>(null);
    const [savingWeek, setSavingWeek] = React.useState<number | null>(null);
    const [feedback, setFeedback] = React.useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    // Draft edits, keyed by week number, kept local until the teacher saves.
    const [drafts, setDrafts] = React.useState<Record<number, { topics: string; objective: string; assessment: string }>>({});

    const load = React.useCallback(() => {
        if (!planId) return;
        api<Plan>(`/ai/plans/${planId}`)
            .then((p) => {
                setPlan(p);
                setDrafts(
                    Object.fromEntries(
                        p.weeks.map((w) => [
                            w.week,
                            {
                                topics: w.topics.join(", "),
                                objective: w.objective,
                                assessment: w.assessment ?? "",
                            },
                        ]),
                    ),
                );
            })
            .catch((err) =>
                setError(err instanceof RequestError ? err.messages.join("; ") : "Could not load the plan"),
            )
            .finally(() => setLoading(false));
    }, [planId]);

    React.useEffect(() => {
        load();
    }, [load]);

    async function toggleWeek(weekNo: number) {
        if (!plan) return;
        const week = plan.weeks.find((w) => w.week === weekNo);
        const next = week?.status === "DONE" ? "PLANNED" : "DONE";
        setBusyWeek(weekNo);
        try {
            await api(`/ai/plans/${plan.id}/weeks/${weekNo}/status`, { method: "PATCH", body: { status: next } });
            setPlan({ ...plan, weeks: plan.weeks.map((w) => (w.week === weekNo ? { ...w, status: next } : w)) });
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Could not update the week" });
        } finally {
            setBusyWeek(null);
        }
    }

    async function saveWeek(weekNo: number) {
        if (!plan) return;
        const draft = drafts[weekNo];
        if (!draft) return;
        setSavingWeek(weekNo);
        setFeedback(null);
        try {
            await api(`/ai/plans/${plan.id}/weeks/${weekNo}`, {
                method: "PATCH",
                body: {
                    topics: draft.topics.split(",").map((t) => t.trim()).filter(Boolean),
                    objective: draft.objective,
                    assessment: draft.assessment.trim() || null,
                },
            });
            setPlan({
                ...plan,
                weeks: plan.weeks.map((w) =>
                    w.week === weekNo
                        ? {
                              ...w,
                              topics: draft.topics.split(",").map((t) => t.trim()).filter(Boolean),
                              objective: draft.objective,
                              assessment: draft.assessment.trim() || null,
                          }
                        : w,
                ),
            });
            setFeedback({ kind: "ok", msg: `Week ${weekNo} saved` });
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Could not save the week" });
        } finally {
            setSavingWeek(null);
        }
    }

    async function regenerateWeek(weekNo: number) {
        if (!plan) return;
        setBusyWeek(weekNo);
        setFeedback(null);
        try {
            await api(`/ai/plans/${plan.id}/weeks/${weekNo}/regenerate`, { method: "POST" });
            load();
            setFeedback({ kind: "ok", msg: `Week ${weekNo} regenerated` });
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Could not regenerate the week" });
        } finally {
            setBusyWeek(null);
        }
    }

    async function activate() {
        if (!plan) return;
        try {
            await api(`/ai/plans/${plan.id}`, { method: "PATCH", body: { status: "ACTIVE" } });
            setFeedback({ kind: "ok", msg: "Plan activated" });
            load();
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Could not activate the plan" });
        }
    }

    async function remove() {
        if (!plan) return;
        try {
            await api(`/ai/plans/${plan.id}`, { method: "DELETE" });
            router.push("/teacher/studio?view=plans");
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Could not delete the plan" });
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <PageHeader title="Lesson Plan" icon={FaBookOpen} />
                <Skeleton className="h-32" />
            </div>
        );
    }

    if (error || !plan) {
        return (
            <div className="space-y-6">
                <PageHeader title="Lesson Plan" icon={FaBookOpen} />
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                    {error ?? "Plan not found"}
                </div>
                <Link href="/teacher/studio?view=plans">
                    <Button variant="outline" className="font-black text-xs uppercase tracking-wider cursor-pointer">
                        <FaArrowLeft size={12} /> Back to plans
                    </Button>
                </Link>
            </div>
        );
    }

    const done = plan.weeks.filter((w) => w.status === "DONE").length;
    const pct = plan.weeks.length ? Math.round((done / plan.weeks.length) * 100) : 0;

    return (
        <div className="space-y-6">
            <PageHeader
                title={plan.title}
                subtitle={`${plan.class.name} · ${plan.subject.name} · ${plan.type} · from ${String(plan.startDate).slice(0, 10)}`}
                icon={FaBookOpen}
                actions={
                    <div className="flex items-center gap-2">
                        <Link href="/teacher/studio?view=plans">
                            <Button variant="outline" className="font-black text-xs uppercase tracking-wider cursor-pointer">
                                <FaArrowLeft size={12} /> Back
                            </Button>
                        </Link>
                        {plan.status !== "ACTIVE" ? (
                            <Button onClick={activate} className="font-black text-xs uppercase tracking-wider">
                                <FaCheck size={12} /> Activate
                            </Button>
                        ) : null}
                    </div>
                }
            />

            {feedback ? (
                <div
                    className={`p-3.5 rounded-xl border text-xs font-bold uppercase tracking-wide ${
                        feedback.kind === "ok"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                    }`}
                >
                    {feedback.msg}
                </div>
            ) : null}

            <Card className="border-border/60 shadow-sm">
                <CardContent className="p-6 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <Badge
                            className={
                                plan.status === "ACTIVE"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                    : "bg-muted text-muted-foreground border-border"
                            }
                        >
                            {plan.status}
                        </Badge>
                        <Progress value={pct} className="flex-1 min-w-[160px]" />
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                            {done}/{plan.weeks.length} weeks · {pct}%
                        </span>
                    </div>
                    <p className="flex items-start gap-2 text-[10px] text-muted-foreground leading-relaxed">
                        <FaExclamation size={12} className="mt-0.5 shrink-0 text-warning" />
                        AI pacing is a draft — verify the week order and topics against your textbook before teaching.
                    </p>
                </CardContent>
            </Card>

            <div className="space-y-3">
                {plan.weeks.map((w) => {
                    const draft = drafts[w.week] ?? { topics: "", objective: "", assessment: "" };
                    const isDone = w.status === "DONE";
                    const busy = busyWeek === w.week;
                    return (
                        <Card key={w.week} className={`border-border/60 shadow-sm ${isDone ? "border-emerald-500/30 bg-emerald-500/5" : ""}`}>
                            <CardHeader className="border-b border-border/60 pb-3 flex flex-row items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={isDone}
                                        disabled={busy}
                                        onChange={() => toggleWeek(w.week)}
                                        className="mt-0.5 cursor-pointer"
                                        aria-label={`Mark week ${w.week} done`}
                                    />
                                    <div>
                                        <CardTitle className="text-sm font-black uppercase tracking-tight">
                                            Week {w.week}
                                        </CardTitle>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                                            {w.startAt}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={busy}
                                    onClick={() => regenerateWeek(w.week)}
                                    className="font-black text-[10px] uppercase tracking-wider"
                                >
                                    {busy ? <FaSpinner className="animate-spin" size={11} /> : <FaRotate size={11} />} Regenerate
                                </Button>
                            </CardHeader>
                            <CardContent className="p-5 space-y-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor={`topics-${w.week}`} className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                                        Topics
                                    </Label>
                                    <Input
                                        id={`topics-${w.week}`}
                                        value={draft.topics}
                                        onChange={(e) => setDrafts((d) => ({ ...d, [w.week]: { ...draft, topics: e.target.value } }))}
                                        placeholder="Comma-separated topics"
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor={`objective-${w.week}`} className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                                        Objective
                                    </Label>
                                    <Textarea
                                        id={`objective-${w.week}`}
                                        value={draft.objective}
                                        onChange={(e) => setDrafts((d) => ({ ...d, [w.week]: { ...draft, objective: e.target.value } }))}
                                        className="min-h-[60px]"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor={`assessment-${w.week}`} className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                                        Assessment <span className="normal-case font-normal">(optional)</span>
                                    </Label>
                                    <Input
                                        id={`assessment-${w.week}`}
                                        value={draft.assessment}
                                        onChange={(e) => setDrafts((d) => ({ ...d, [w.week]: { ...draft, assessment: e.target.value } }))}
                                        placeholder="e.g. Quiz, Assignment"
                                        className="h-10"
                                    />
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={savingWeek === w.week}
                                    onClick={() => saveWeek(w.week)}
                                    className="font-black text-[10px] uppercase tracking-wider"
                                >
                                    {savingWeek === w.week ? (
                                        <FaSpinner className="animate-spin" size={11} />
                                    ) : (
                                        <FaFloppyDisk size={11} />
                                    )}{" "}
                                    Save week
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="flex gap-3">
                <Button
                    variant="outline"
                    onClick={remove}
                    className="font-black text-xs uppercase tracking-wider text-destructive hover:text-destructive cursor-pointer"
                >
                    Delete plan
                </Button>
            </div>
        </div>
    );
}
