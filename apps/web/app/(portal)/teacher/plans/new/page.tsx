"use client";

// app/(portal)/teacher/plans/new/page.tsx — full-page form for generating an
// AI lesson plan (replaces the cramped modal).
//
// The blueprint is explicit: class + subject, plan type, how many weeks the
// plan runs for, when it starts, and optional focus topics.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FaBookOpen, FaSpinner, FaArrowLeft, FaCalendarDays, FaLayerGroup } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { api, RequestError } from "@/lib/api";
import { dedupeSubjects } from "@/lib/subjects";
import { useMyTeacher } from "@/lib/teacher-session";
import { myClasses } from "@/lib/teacher-classes";

interface ClassOption {
    id: string;
    name: string;
    subjects: { subject: { id: string; name: string }; teacher?: { id: string } | null }[];
}

/** Default plan lengths — mirrors the API's own defaults. */
const DEFAULT_WEEKS: Record<"YEAR" | "TERM", number> = { YEAR: 16, TERM: 12 };

/**
 * Labelled form row. Declared at module scope on purpose: an inline
 * component would be a new type on every render, remounting the input and
 * dropping focus mid-typing.
 */
function Field({
    label,
    children,
    required,
    hint,
}: {
    label: string;
    children: React.ReactNode;
    required?: boolean;
    hint?: string;
}) {
    const id = React.useId();
    const child = React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            id,
            required: required || undefined,
        })
        : children;
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id} className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                {label} {required ? <span className="text-primary">*</span> : null}
            </Label>
            {child}
            {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
        </div>
    );
}

export default function NewPlanPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { teacherId } = useMyTeacher();

    const [classes, setClasses] = React.useState<ClassOption[]>([]);
    const [loadingClasses, setLoadingClasses] = React.useState(true);
    const [classId, setClassId] = React.useState<string | null>(null);
    const [subjectId, setSubjectId] = React.useState<string | null>(null);
    const [type, setType] = React.useState<"YEAR" | "TERM">("TERM");
    const [weeks, setWeeks] = React.useState(String(DEFAULT_WEEKS.TERM));
    const [startDate, setStartDate] = React.useState(new Date().toISOString().slice(0, 10));
    const [topicsHint, setTopicsHint] = React.useState("");
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    // Carry topics over from the Sources page ("Make lesson plan").
    React.useEffect(() => {
        const t = searchParams.get("topics");
        if (t) setTopicsHint(t);
    }, [searchParams]);

    React.useEffect(() => {
        if (!teacherId) return;
        api<{ classes: ClassOption[] }>("/classes")
            .then((p) => {
                const mine = myClasses(p.classes, teacherId);
                setClasses(mine);
                setClassId((prev) => (prev && mine.some((c) => c.id === prev) ? prev : (mine[0]?.id ?? null)));
            })
            .catch(() => setClasses([]))
            .finally(() => setLoadingClasses(false));
    }, [teacherId]);

    const selectedClass = classes.find((c) => c.id === classId);
    const weekCount = Number(weeks) || 0;

    // Switching the plan type re-seeds the week count with that type's
    // default — 16 weeks for a year, 12 for a term.
    function chooseType(next: "YEAR" | "TERM") {
        setType(next);
        setWeeks(String(DEFAULT_WEEKS[next]));
    }

    const valid = !!subjectId && weekCount >= 1 && weekCount <= 52 && !!startDate;

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            await api("/ai/plans/generate", {
                method: "POST",
                body: {
                    classId,
                    subjectId,
                    type,
                    startDate,
                    weeks: weekCount,
                    topicsHint: topicsHint.trim() || undefined,
                },
            });
            router.push("/teacher/studio?view=plans");
        } catch (err) {
            setError(err instanceof RequestError ? err.messages.join("; ") : "Could not generate the plan");
            setBusy(false);
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Generate Lesson Plan"
                subtitle="Set the term shape, then let the AI draft the weeks"
                icon={FaBookOpen}
                actions={
                    <Link href="/teacher/studio?view=plans">
                        <Button variant="outline" className="font-black text-xs uppercase tracking-wider cursor-pointer">
                            <FaArrowLeft size={12} /> Back to plans
                        </Button>
                    </Link>
                }
            />

            <form onSubmit={submit} className="space-y-5 max-w-4xl">
                {error ? (
                    <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                        {error}
                    </div>
                ) : null}

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="border-b border-border/60 pb-4">
                        <CardTitle className="text-lg font-black uppercase tracking-tight">What to plan</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Class" required>
                                <Select value={classId ?? undefined} onValueChange={(v) => { setClassId(v); setSubjectId(null); }}>
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder={loadingClasses ? "Loading…" : "Select class"} />
                                    </SelectTrigger>
                                    <SelectContent searchable>
                                        {classes.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Subject" required>
                                <Select value={subjectId ?? undefined} onValueChange={setSubjectId}>
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Select subject" />
                                    </SelectTrigger>
                                    <SelectContent searchable>
                                        {dedupeSubjects(selectedClass?.subjects).map((s) => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>
                        <Field label="Focus topics" hint="Optional, comma-separated. The AI aligns the weeks to these.">
                            <Textarea
                                value={topicsHint}
                                onChange={(e) => setTopicsHint(e.target.value)}
                                className="min-h-[80px]"
                                placeholder="e.g. Fractions, Percentage, Algebra"
                            />
                        </Field>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="border-b border-border/60 pb-4">
                        <CardTitle className="text-lg font-black uppercase tracking-tight">Term shape</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => chooseType("TERM")}
                                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${type === "TERM" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                            >
                                <FaLayerGroup className="mt-0.5 text-primary shrink-0" size={16} />
                                <span>
                                    <span className="block text-sm font-black uppercase tracking-tight">Term</span>
                                    <span className="block text-xs text-muted-foreground mt-0.5">One exam term — about {DEFAULT_WEEKS.TERM} weeks.</span>
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => chooseType("YEAR")}
                                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${type === "YEAR" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                            >
                                <FaBookOpen className="mt-0.5 text-primary shrink-0" size={16} />
                                <span>
                                    <span className="block text-sm font-black uppercase tracking-tight">Full year</span>
                                    <span className="block text-xs text-muted-foreground mt-0.5">The whole academic year — about {DEFAULT_WEEKS.YEAR} weeks.</span>
                                </span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Number of weeks" required hint="1–52. Week dates are computed from the start date, skipping Fridays.">
                                <Input
                                    type="number"
                                    min={1}
                                    max={52}
                                    value={weeks}
                                    onChange={(e) => setWeeks(e.target.value)}
                                    className="h-11"
                                />
                            </Field>
                            <Field label="Starts on" required>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="h-11"
                                />
                            </Field>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg bg-muted/50 px-4 py-3">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                                <FaCalendarDays size={11} className="mr-1 inline" />
                                {weekCount} week plan · {type === "TERM" ? "term" : "full year"} · from {startDate}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex gap-3">
                    <Button type="submit" disabled={busy || !valid} className="font-black text-xs uppercase tracking-wider">
                        {busy ? (
                            <><FaSpinner className="animate-spin" size={12} /> Generating…</>
                        ) : (
                            <><FaBookOpen size={12} /> Generate Plan</>
                        )}
                    </Button>
                    <Link href="/teacher/studio?view=plans">
                        <Button type="button" variant="outline" className="font-black text-xs uppercase tracking-wider cursor-pointer">
                            Cancel
                        </Button>
                    </Link>
                </div>
            </form>
        </div>
    );
}
