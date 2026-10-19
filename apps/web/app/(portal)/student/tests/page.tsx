"use client";

// app/(portal)/student/tests/page.tsx — online tests the student can take.
//
// The list shows every online paper open to the student's class. "Start" asks
// the API to open (or resume) an attempt; the attempt view renders the
// questions, autosaves each answer, and submits the attempt for grading.

import * as React from "react";
import { motion } from "motion/react";
import { FaFilePen, FaPaperPlane, FaClock } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { api, RequestError } from "@/lib/api";

interface Question {
    id: string;
    type: "MCQ" | "SHORT" | "LONG";
    text: string;
    options: string[];
    marks: number;
    order: number;
}

interface Paper {
    id: string;
    title: string;
    durationMinutes: number;
    totalMarks: number;
    startAt: string | null;
    endAt: string | null;
    class: { name: string };
    subject: { name: string };
    questions: Question[];
    attempts: { id: string; status: string }[];
}

interface Attempt {
    id: string;
    status: "IN_PROGRESS" | "SUBMITTED" | "GRADED";
    totalScore: number | null;
    answers: { questionId: string; answer: string; score: number | null }[];
    paper: Paper;
}

export default function StudentTestsPage() {
    const [papers, setPapers] = React.useState<Paper[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [attempt, setAttempt] = React.useState<Attempt | null>(null);
    const [answers, setAnswers] = React.useState<Record<string, string>>({});
    const [busy, setBusy] = React.useState(false);
    const [feedback, setFeedback] = React.useState<{ kind: "ok" | "err"; msg: string } | null>(null);
    const [savedAt, setSavedAt] = React.useState<string | null>(null);

    const load = React.useCallback(() => {
        api<Paper[]>("/ai/tests/online/available")
            .then((p) => setPapers(p))
            .catch(() => setPapers([]))
            .finally(() => setLoading(false));
    }, []);

    React.useEffect(() => { load(); }, [load]);

    // Seed the answer map from the attempt's already-saved answers.
    React.useEffect(() => {
        if (!attempt) return;
        const seeded: Record<string, string> = {};
        for (const a of attempt.answers) seeded[a.questionId] = a.answer;
        setAnswers(seeded);
    }, [attempt]);

    async function start(paperId: string) {
        setBusy(true);
        setFeedback(null);
        try {
            const started = await api<Attempt>(`/ai/tests/${paperId}/attempts`, { method: "POST" });
            setAttempt(started);
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Could not start the test" });
        } finally {
            setBusy(false);
        }
    }

    /**
     * Autosave one answer. MCQ picks save immediately; written answers are
     * debounced so a paragraph does not fire one request per keystroke.
     */
    const timers = React.useRef<Record<string, number>>({});
    const pending = React.useRef<Record<string, string>>({});

    async function persist(questionId: string, value: string) {
        if (!attempt) return;
        try {
            await api(`/ai/tests/attempts/${attempt.id}/answers`, {
                method: "POST",
                body: { questionId, answer: value },
            });
            setSavedAt(new Date().toLocaleTimeString());
            setFeedback(null);
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Autosave failed" });
        }
    }

    function save(questionId: string, value: string, immediate: boolean) {
        setAnswers((prev) => ({ ...prev, [questionId]: value }));
        clearTimeout(timers.current[questionId]);
        if (immediate) {
            delete pending.current[questionId];
            void persist(questionId, value);
            return;
        }
        pending.current[questionId] = value;
        timers.current[questionId] = window.setTimeout(() => {
            delete timers.current[questionId];
            delete pending.current[questionId];
            void persist(questionId, value);
        }, 800);
    }

    async function submit() {
        if (!attempt) return;
        setBusy(true);
        try {
            // Flush any debounced answer so the last keystrokes are not lost.
            const queued = Object.entries(pending.current);
            for (const [questionId, value] of queued) {
                clearTimeout(timers.current[questionId]);
                await persist(questionId, value);
            }
            pending.current = {};

            await api(`/ai/tests/attempts/${attempt.id}/submit`, { method: "POST" });
            setFeedback({ kind: "ok", msg: "Submitted. Your teacher will grade the written answers." });
            setAttempt(null);
            load();
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Submit failed" });
        } finally {
            setBusy(false);
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <PageHeader title="Online Tests" icon={FaFilePen} />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
            </div>
        );
    }

    // ---- Attempt view ----------------------------------------------------
    if (attempt) {
        const paper = attempt.paper;
        const answered = Object.values(answers).filter((a) => a.trim()).length;
        return (
            <div className="space-y-6">
                <PageHeader
                    title={paper.title}
                    subtitle={`${paper.class.name} · ${paper.subject.name} · ${paper.totalMarks} marks · ${paper.durationMinutes} min`}
                    icon={FaFilePen}
                />

                {feedback ? (
                    <div className={`p-4 text-xs font-bold text-center uppercase tracking-wide rounded-xl shadow-sm border ${feedback.kind === "ok" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                        {feedback.msg}
                    </div>
                ) : null}

                <div className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-wider text-muted-foreground">
                    <span>{answered} / {paper.questions.length} answered</span>
                    {savedAt ? <span className="flex items-center gap-1"><FaClock size={11} /> Saved {savedAt}</span> : null}
                </div>

                {paper.questions.map((q, i) => (
                    <motion.div key={q.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="border-border/60 shadow-sm">
                            <CardHeader className="border-b border-border/60 pb-4">
                                <div className="flex items-start justify-between gap-3">
                                    <CardTitle className="text-base font-black">
                                        Q{i + 1}. {q.text}
                                    </CardTitle>
                                    <Badge variant="secondary">{q.marks} mark{q.marks === 1 ? "" : "s"}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                {q.type === "MCQ" ? (
                                    <div className="space-y-2">
                                        {q.options.map((opt, oi) => (
                                            <label
                                                key={oi}
                                                htmlFor={`${q.id}-${oi}`}
                                                className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2 cursor-pointer hover:border-primary/50 transition-colors"
                                            >
                                                <input
                                                    id={`${q.id}-${oi}`}
                                                    type="radio"
                                                    name={q.id}
                                                    value={opt}
                                                    checked={answers[q.id] === opt}
                                                    onChange={() => save(q.id, opt, true)}
                                                    className="accent-primary"
                                                />
                                                <span className="text-sm font-medium">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <Textarea
                                        value={answers[q.id] ?? ""}
                                        onChange={(e) => save(q.id, e.target.value, false)}
                                        onBlur={(e) => save(q.id, e.target.value, true)}
                                        rows={q.type === "LONG" ? 6 : 3}
                                        placeholder={q.type === "LONG" ? "Write your full answer…" : "Write your answer…"}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}

                <Button onClick={submit} disabled={busy} className="w-full font-black text-xs uppercase tracking-wider">
                    <FaPaperPlane size={12} /> {busy ? "Submitting…" : "Submit test"}
                </Button>
            </div>
        );
    }

    // ---- List view -------------------------------------------------------
    return (
        <div className="space-y-6">
            <PageHeader title="Online Tests" subtitle="Tests your teachers have published for your class" icon={FaFilePen} />

            {feedback ? (
                <div className={`p-4 text-xs font-bold text-center uppercase tracking-wide rounded-xl shadow-sm border ${feedback.kind === "ok" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                    {feedback.msg}
                </div>
            ) : null}

            {papers.length === 0 ? (
                <EmptyState title="No open tests" description="There are no online tests available right now." />
            ) : (
                papers.map((p) => {
                    const mine = p.attempts?.[0];
                    const done = mine && mine.status !== "IN_PROGRESS";
                    return (
                        <motion.div key={p.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                            <Card className="border-border/60 shadow-sm">
                                <CardHeader className="border-b border-border/60 pb-4 flex flex-row items-start justify-between gap-3">
                                    <div>
                                        <CardTitle className="text-lg font-black uppercase tracking-tight">{p.title}</CardTitle>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mt-1">
                                            {p.class.name} · {p.subject.name} · {p.totalMarks} marks · {p.durationMinutes} min
                                        </p>
                                    </div>
                                    {done ? (
                                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Submitted</Badge>
                                    ) : mine ? (
                                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">In progress</Badge>
                                    ) : null}
                                </CardHeader>
                                <CardContent className="p-6 flex items-center justify-between gap-3">
                                    <p className="text-xs text-muted-foreground">
                                        {p.endAt ? `Closes ${new Date(p.endAt).toLocaleString()}` : "No closing time"}
                                    </p>
                                    <Button
                                        onClick={() => start(p.id)}
                                        disabled={busy || done}
                                        className="font-black text-xs uppercase tracking-wider"
                                    >
                                        {done ? "Submitted" : mine ? "Resume" : "Start"}
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })
            )}
        </div>
    );
}
