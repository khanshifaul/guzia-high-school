"use client";

// app/(portal)/teacher/tests/new/page.tsx — full-page blueprint form for
// generating an AI test paper (replaces the cramped modal).
//
// The blueprint is explicit: a question mix that adds up to a total mark
// value, a delivery mode (print/offline vs online window), and topics.

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FaClipboardList, FaSpinner, FaArrowLeft, FaPrint, FaDesktop } from "react-icons/fa6";
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

/** Marks awarded per question type — server-side blueprint math (mirrors the API). */
const MARKS_BY_TYPE = { MCQ: 1, SHORT: 2, LONG: 5 } as const;

type MixKey = keyof typeof MARKS_BY_TYPE;

/**
 * Labelled form row. Declared at module scope on purpose: an inline
 * component would be a new type on every render, remounting the input and
 * dropping focus mid-typing.
 */
function Field({ label, children, required, hint }: { label: string; children: React.ReactNode; required?: boolean; hint?: string }) {
    const id = React.useId();
    const child = React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, { id, required: required || undefined })
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

export default function NewTestPaperPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { teacherId } = useMyTeacher();

    const [classes, setClasses] = React.useState<ClassOption[]>([]);
    const [loadingClasses, setLoadingClasses] = React.useState(true);
    const [classId, setClassId] = React.useState<string | null>(null);
    const [subjectId, setSubjectId] = React.useState<string | null>(null);
    const [topics, setTopics] = React.useState("");
    const [mix, setMix] = React.useState<Record<MixKey, string>>({ MCQ: "10", SHORT: "5", LONG: "3" });
    const [duration, setDuration] = React.useState("90");
    const [mode, setMode] = React.useState<"OFFLINE" | "ONLINE">("OFFLINE");
    const [startAt, setStartAt] = React.useState("");
    const [endAt, setEndAt] = React.useState("");
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    // Carry topics over from the Sources page ("Make test paper").
    React.useEffect(() => {
        const t = searchParams.get("topics");
        if (t) setTopics(t);
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
    const counts = { MCQ: Number(mix.MCQ) || 0, SHORT: Number(mix.SHORT) || 0, LONG: Number(mix.LONG) || 0 };
    const totalMarks = counts.MCQ * MARKS_BY_TYPE.MCQ + counts.SHORT * MARKS_BY_TYPE.SHORT + counts.LONG * MARKS_BY_TYPE.LONG;
    const totalQuestions = counts.MCQ + counts.SHORT + counts.LONG;

    const valid =
        !!subjectId &&
        topics.trim().length > 0 &&
        totalQuestions > 0 &&
        Number(duration) >= 10 &&
        (mode === "OFFLINE" || (!!startAt && !!endAt && new Date(startAt) < new Date(endAt)));

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            await api("/ai/tests/generate", {
                method: "POST",
                body: {
                    classId,
                    subjectId,
                    topics: topics.split(",").map((t) => t.trim()).filter(Boolean),
                    mcq: counts.MCQ,
                    short: counts.SHORT,
                    long: counts.LONG,
                    totalMarks,
                    durationMinutes: Number(duration),
                    mode,
                    startAt: mode === "ONLINE" ? new Date(startAt).toISOString() : undefined,
                    endAt: mode === "ONLINE" ? new Date(endAt).toISOString() : undefined,
                },
            });
            router.push("/teacher/studio?view=tests");
        } catch (err) {
            setError(err instanceof RequestError ? err.messages.join("; ") : "Could not generate the paper");
            setBusy(false);
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Generate Test Paper" subtitle="Set the blueprint, then let the AI draft the questions" icon={FaClipboardList}
                actions={
                    <Link href="/teacher/studio?view=tests">
                        <Button variant="outline" className="font-black text-xs uppercase tracking-wider cursor-pointer">
                            <FaArrowLeft size={12} /> Back to papers
                        </Button>
                    </Link>
                } />

            <form onSubmit={submit} className="space-y-5 max-w-4xl">
                {error ? (
                    <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                        {error}
                    </div>
                ) : null}

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="border-b border-border/60 pb-4">
                        <CardTitle className="text-lg font-black uppercase tracking-tight">What to test</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Class" required>
                                <Select value={classId ?? undefined} onValueChange={(v) => { setClassId(v); setSubjectId(null); }}>
                                    <SelectTrigger className="h-11"><SelectValue placeholder={loadingClasses ? "Loading…" : "Select class"} /></SelectTrigger>
                                    <SelectContent searchable>
                                        {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Subject" required>
                                <Select value={subjectId ?? undefined} onValueChange={setSubjectId}>
                                    <SelectTrigger className="h-11"><SelectValue placeholder="Select subject" /></SelectTrigger>
                                    <SelectContent searchable>
                                        {dedupeSubjects(selectedClass?.subjects).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>
                        <Field label="Topics" required hint="Comma-separated. The AI writes questions that cover these.">
                            <Textarea
                                value={topics}
                                onChange={(e) => setTopics(e.target.value)}
                                className="min-h-[88px]"
                                placeholder="e.g. Fractions, Percentage, Algebra, Word problems"
                            />
                        </Field>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="border-b border-border/60 pb-4">
                        <CardTitle className="text-lg font-black uppercase tracking-tight">Question mix</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Field label="MCQ" hint={`${MARKS_BY_TYPE.MCQ} mark each`}>
                                <Input type="number" min={0} max={30} value={mix.MCQ} onChange={(e) => setMix((m) => ({ ...m, MCQ: e.target.value }))} className="h-11" />
                            </Field>
                            <Field label="Short answer" hint={`${MARKS_BY_TYPE.SHORT} marks each`}>
                                <Input type="number" min={0} max={20} value={mix.SHORT} onChange={(e) => setMix((m) => ({ ...m, SHORT: e.target.value }))} className="h-11" />
                            </Field>
                            <Field label="Long answer" hint={`${MARKS_BY_TYPE.LONG} marks each`}>
                                <Input type="number" min={0} max={10} value={mix.LONG} onChange={(e) => setMix((m) => ({ ...m, LONG: e.target.value }))} className="h-11" />
                            </Field>
                            <Field label="Duration (min)" required>
                                <Input type="number" min={10} max={300} value={duration} onChange={(e) => setDuration(e.target.value)} className="h-11" />
                            </Field>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg bg-muted/50 px-4 py-3">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                                {totalQuestions} questions · {totalMarks} marks
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                                MCQ×{MARKS_BY_TYPE.MCQ} + Short×{MARKS_BY_TYPE.SHORT} + Long×{MARKS_BY_TYPE.LONG}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="border-b border-border/60 pb-4">
                        <CardTitle className="text-lg font-black uppercase tracking-tight">Delivery</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setMode("OFFLINE")}
                                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${mode === "OFFLINE" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                            >
                                <FaPrint className="mt-0.5 text-primary shrink-0" size={16} />
                                <span>
                                    <span className="block text-sm font-black uppercase tracking-tight">Print (offline)</span>
                                    <span className="block text-xs text-muted-foreground mt-0.5">Paper handed out in class; students write on paper.</span>
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode("ONLINE")}
                                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${mode === "ONLINE" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                            >
                                <FaDesktop className="mt-0.5 text-primary shrink-0" size={16} />
                                <span>
                                    <span className="block text-sm font-black uppercase tracking-tight">Online test</span>
                                    <span className="block text-xs text-muted-foreground mt-0.5">Students answer in the portal inside a time window.</span>
                                </span>
                            </button>
                        </div>

                        {mode === "ONLINE" ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Opens at" required>
                                    <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="h-11" />
                                </Field>
                                <Field label="Closes at" required>
                                    <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className="h-11" />
                                </Field>
                            </div>
                        ) : null}
                    </CardContent>
                </Card>

                <div className="flex gap-3">
                    <Button type="submit" disabled={busy || !valid} className="font-black text-xs uppercase tracking-wider">
                        {busy ? <><FaSpinner className="animate-spin" size={12} /> Generating…</> : <><FaClipboardList size={12} /> Generate Paper</>}
                    </Button>
                    <Link href="/teacher/studio?view=tests">
                        <Button type="button" variant="outline" className="font-black text-xs uppercase tracking-wider cursor-pointer">Cancel</Button>
                    </Link>
                </div>
            </form>
        </div>
    );
}
