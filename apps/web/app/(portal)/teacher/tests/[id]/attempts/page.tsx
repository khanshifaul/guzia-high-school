"use client";

// app/(portal)/teacher/tests/[id]/attempts/page.tsx — grade the attempts on
// an online test paper. MCQ answers are auto-graded by the server; written
// answers need a score from the teacher.

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import { FaArrowLeft, FaUsers, FaCheck } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { api, RequestError } from "@/lib/api";

interface GradedAnswer {
    id: string;
    answer: string;
    score: number | null;
    autoGraded: boolean | null;
    question: {
        id: string;
        type: "MCQ" | "SHORT" | "LONG";
        text: string;
        answer: string;
        marks: number;
    };
}

interface Attempt {
    id: string;
    status: "IN_PROGRESS" | "SUBMITTED" | "GRADED";
    startedAt: string;
    submittedAt: string | null;
    totalScore: number | null;
    student: { id: string; fullName: string; rollNo: string | null };
    answers: GradedAnswer[];
}

export default function TeacherAttemptsPage() {
    const params = useParams<{ id: string }>();
    const paperId = params?.id as string;

    const [attempts, setAttempts] = React.useState<Attempt[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [scores, setScores] = React.useState<Record<string, string>>({});
    const [busy, setBusy] = React.useState<string | null>(null);
    const [feedback, setFeedback] = React.useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    const load = React.useCallback(() => {
        if (!paperId) return;
        api<Attempt[]>(`/ai/tests/${paperId}/attempts`)
            .then((p) => {
                setAttempts(p);
                // Seed the inputs with the scores the server already holds, so
                // an already-graded answer shows its value.
                const seeded: Record<string, string> = {};
                for (const a of p) {
                    for (const ans of a.answers) {
                        if (ans.score !== null) seeded[ans.id] = String(ans.score);
                    }
                }
                setScores(seeded);
            })
            .catch(() => setAttempts([]))
            .finally(() => setLoading(false));
    }, [paperId]);

    React.useEffect(() => { load(); }, [load]);

    async function grade(answerId: string, maxMarks: number) {
        const raw = scores[answerId] ?? "";
        const value = Number(raw);
        if (raw.trim() === "" || Number.isNaN(value)) {
            setFeedback({ kind: "err", msg: "Enter a score first" });
            return;
        }
        if (value < 0 || value > maxMarks) {
            setFeedback({ kind: "err", msg: `Score must be between 0 and ${maxMarks}` });
            return;
        }
        setBusy(answerId);
        setFeedback(null);
        try {
            await api(`/ai/tests/answers/${answerId}/grade`, { method: "POST", body: { score: value } });
            setFeedback({ kind: "ok", msg: "Score saved" });
            load();
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Could not save the score" });
        } finally {
            setBusy(null);
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <PageHeader title="Attempts" icon={FaUsers} />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
            </div>
        );
    }

    if (attempts.length === 0) {
        return (
            <div className="space-y-6">
                <PageHeader title="Attempts" icon={FaUsers} />
                <EmptyState title="No attempts yet" description="No student has taken this test yet." />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Attempts"
                subtitle={`${attempts.length} student${attempts.length === 1 ? "" : "s"}`}
                icon={FaUsers}
                actions={
                    <Link href="/teacher/tests">
                        <Button variant="outline" className="font-black text-xs uppercase tracking-wider">
                            <FaArrowLeft size={12} /> Back to Papers
                        </Button>
                    </Link>
                }
            />

            {feedback ? (
                <div className={`p-4 text-xs font-bold text-center uppercase tracking-wide rounded-xl shadow-sm border ${feedback.kind === "ok" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                    {feedback.msg}
                </div>
            ) : null}

            {attempts.map((a) => (
                <motion.div key={a.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="border-border/60 shadow-sm">
                        <CardHeader className="border-b border-border/60 pb-4 flex flex-row items-start justify-between gap-3">
                            <div>
                                <CardTitle className="text-lg font-black uppercase tracking-tight">
                                    {a.student.fullName}
                                    {a.student.rollNo ? <span className="text-xs font-bold text-muted-foreground ml-2">Roll {a.student.rollNo}</span> : null}
                                </CardTitle>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mt-1">
                                    Started {new Date(a.startedAt).toLocaleString()}
                                    {a.submittedAt ? ` · Submitted ${new Date(a.submittedAt).toLocaleString()}` : " · Not submitted"}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-wider">
                                    {a.status === "GRADED" ? "Graded" : a.status === "SUBMITTED" ? "Awaiting marks" : "In progress"}
                                </Badge>
                                {a.totalScore !== null ? (
                                    <Badge className="bg-primary/10 text-primary border-primary/20">{a.totalScore} marks</Badge>
                                ) : null}
                            </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-3">
                            {a.answers.map((ans) => {
                                const pending = ans.autoGraded === false && ans.score === null;
                                return (
                                    <div key={ans.id} className="p-3 rounded-lg border border-border/60">
                                        <div className="flex items-start justify-between gap-3">
                                            <p className="text-sm font-semibold">{ans.question.text}</p>
                                            <Badge variant="secondary" className="shrink-0 text-[9px] font-black uppercase tracking-wider">
                                                {ans.question.type} · {ans.question.marks}m
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Student: {ans.answer || <span className="italic">no answer</span>}
                                        </p>
                                        {ans.question.type !== "MCQ" ? (
                                            <p className="text-[11px] text-muted-foreground mt-0.5">Model answer: {ans.question.answer}</p>
                                        ) : null}

                                        {ans.autoGraded ? (
                                            <p className="text-xs font-bold text-emerald-600 mt-2">
                                                Auto-graded: {ans.score} / {ans.question.marks}
                                            </p>
                                        ) : (
                                            <div className="flex items-center gap-2 mt-2">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={ans.question.marks}
                                                    value={scores[ans.id] ?? (ans.score === null ? "" : String(ans.score))}
                                                    onChange={(e) => setScores((prev) => ({ ...prev, [ans.id]: e.target.value }))}
                                                    className="w-24"
                                                />
                                                <span className="text-xs text-muted-foreground">/ {ans.question.marks}</span>
                                                <Button
                                                    size="sm"
                                                    onClick={() => grade(ans.id, ans.question.marks)}
                                                    disabled={busy === ans.id}
                                                    className="font-black text-[10px] uppercase tracking-wider"
                                                >
                                                    <FaCheck size={11} /> {busy === ans.id ? "Saving…" : "Save"}
                                                </Button>
                                                {pending ? <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Ungraded</Badge> : null}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
    );
}
