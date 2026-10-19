"use client";

// app/(portal)/teacher/assignments/[id]/page.tsx — the grading view.
//
// specs/06: "assignments/[id] | submissions | grading table: student,
// content (expandable), grade input 0..100 + feedback, save".
//
// The teacher's own assignments only — the server enforces that, and this
// page shows the API's error rather than pretending the list is empty.

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { FaArrowLeft, FaCheck, FaSpinner } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { api, RequestError } from "@/lib/api";

interface Submission {
    id: string;
    content: string;
    status: string;
    grade: number | null;
    feedback: string | null;
    createdAt: string;
    student: { id: string; user: { fullName: string } };
}

interface AssignmentDetail {
    id: string;
    title: string;
    description: string | null;
    dueDate: string;
    subject: { name: string };
    submissions: Submission[];
}

/** One row of the grading table, with its own unsaved state. */
interface Row {
    grade: string;
    feedback: string;
    saving: boolean;
    saved: boolean;
    error: string | null;
}

export default function GradeAssignmentPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [assignment, setAssignment] = React.useState<AssignmentDetail | null>(null);
    const [rows, setRows] = React.useState<Record<string, Row>>({});
    const [loading, setLoading] = React.useState(true);
    const [loadError, setLoadError] = React.useState<string | null>(null);

    React.useEffect(() => {
        api<AssignmentDetail>(`/assignments/${id}/submissions`)
            .then((a) => {
                setAssignment(a);
                const initial: Record<string, Row> = {};
                for (const s of a.submissions) {
                    initial[s.id] = {
                        grade: s.grade === null ? "" : String(s.grade),
                        feedback: s.feedback ?? "",
                        saving: false,
                        saved: false,
                        error: null,
                    };
                }
                setRows(initial);
            })
            .catch((err) =>
                setLoadError(
                    err instanceof RequestError
                        ? err.messages.join("; ")
                        : "Could not load this assignment",
                ),
            )
            .finally(() => setLoading(false));
    }, [id]);

    function setRow(submissionId: string, patch: Partial<Row>) {
        setRows((prev) => ({
            ...prev,
            [submissionId]: { ...prev[submissionId], ...patch },
        }));
    }

    async function save(submissionId: string) {
        const row = rows[submissionId];
        if (!row) return;
        const grade = Number(row.grade);
        if (!Number.isInteger(grade) || grade < 0 || grade > 100) {
            setRow(submissionId, { error: "Grade must be a whole number from 0 to 100" });
            return;
        }
        setRow(submissionId, { saving: true, error: null });
        try {
            await api(`/assignments/submissions/${submissionId}/grade`, {
                method: "POST",
                body: { grade, feedback: row.feedback || undefined },
            });
            setRow(submissionId, { saving: false, saved: true });
        } catch (err) {
            setRow(submissionId, {
                saving: false,
                error: err instanceof RequestError ? err.messages.join("; ") : "Save failed",
            });
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <PageHeader title="Grading" icon={FaArrowLeft} />
                <Skeleton className="h-32" />
            </div>
        );
    }

    if (loadError || !assignment) {
        return (
            <div className="space-y-6">
                <PageHeader title="Grading" icon={FaArrowLeft} />
                <EmptyState
                    title="Cannot open this assignment"
                    description={loadError ?? "Assignment not found."}
                />
                <Button variant="outline" onClick={() => router.push("/teacher/assignments")}>
                    Back to assignments
                </Button>
            </div>
        );
    }

    const ungraded = assignment.submissions.filter((s) => s.grade === null).length;

    return (
        <div className="space-y-6">
            <PageHeader
                title={assignment.title}
                subtitle={`${assignment.subject.name} · due ${new Date(assignment.dueDate).toLocaleDateString()}`}
                icon={FaArrowLeft}
                actions={
                    <Button
                        variant="outline"
                        onClick={() => router.push("/teacher/assignments")}
                        className="font-black text-xs uppercase tracking-wider cursor-pointer"
                    >
                        <FaArrowLeft size={12} /> All assignments
                    </Button>
                }
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-border/60 shadow-sm">
                    <CardContent className="p-5">
                        <p className="text-2xl font-black text-primary">{assignment.submissions.length}</p>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mt-1">
                            Submissions
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-border/60 shadow-sm">
                    <CardContent className="p-5">
                        <p className="text-2xl font-black text-primary">{ungraded}</p>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mt-1">
                            Awaiting a grade
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-border/60 shadow-sm">
                    <CardContent className="p-5">
                        <p className="text-2xl font-black text-primary">
                            {assignment.submissions.length - ungraded}
                        </p>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mt-1">
                            Graded
                        </p>
                    </CardContent>
                </Card>
            </div>

            {assignment.description ? (
                <Card className="border-border/60 shadow-sm">
                    <CardContent className="p-5">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1">
                            Instructions
                        </p>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                            {assignment.description}
                        </p>
                    </CardContent>
                </Card>
            ) : null}

            {assignment.submissions.length === 0 ? (
                <EmptyState
                    title="No submissions yet"
                    description="Students have not submitted their work for this assignment."
                />
            ) : (
                <div className="space-y-4">
                    {assignment.submissions.map((s, i) => {
                        const row = rows[s.id];
                        if (!row) return null;
                        return (
                            <motion.div
                                key={s.id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                            >
                                <Card className="border-border/60 shadow-sm">
                                    <CardHeader className="border-b border-border/60 pb-4 flex flex-row items-center justify-between gap-3">
                                        <CardTitle className="text-base font-black uppercase tracking-tight">
                                            {s.student.user.fullName}
                                        </CardTitle>
                                        <div className="flex gap-2">
                                            {s.status === "LATE" || s.status === "LATE_GRADED" ? (
                                                <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20">
                                                    Late
                                                </Badge>
                                            ) : null}
                                            <Badge
                                                className={
                                                    s.grade === null
                                                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                                        : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                                }
                                            >
                                                {s.grade === null ? "Not graded" : `Grade ${s.grade}`}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-4">
                                        <details className="group">
                                            <summary className="cursor-pointer text-[10px] font-black text-primary uppercase tracking-wider select-none">
                                                View submitted work
                                            </summary>
                                            <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground bg-muted/40 rounded-xl p-4">
                                                {s.content}
                                            </p>
                                        </details>

                                        <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3 items-start">
                                            <div>
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                                                    Grade (0–100)
                                                </label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    value={row.grade}
                                                    onChange={(e) =>
                                                        setRow(s.id, {
                                                            grade: e.target.value,
                                                            saved: false,
                                                            error: null,
                                                        })
                                                    }
                                                    placeholder="—"
                                                    className="h-11 mt-1"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                                                    Feedback
                                                </label>
                                                <Textarea
                                                    value={row.feedback}
                                                    onChange={(e) =>
                                                        setRow(s.id, {
                                                            feedback: e.target.value,
                                                            saved: false,
                                                            error: null,
                                                        })
                                                    }
                                                    rows={3}
                                                    placeholder="Comments for the student (optional)"
                                                    className="mt-1"
                                                />
                                            </div>
                                        </div>

                                        {row.error ? (
                                            <p className="text-xs font-bold text-destructive">{row.error}</p>
                                        ) : null}

                                        <div className="flex items-center gap-3">
                                            <Button
                                                onClick={() => save(s.id)}
                                                disabled={row.saving || row.grade === ""}
                                                className="font-black text-xs uppercase tracking-wider cursor-pointer"
                                            >
                                                {row.saving ? (
                                                    <>
                                                        <FaSpinner className="animate-spin" size={12} /> Saving…
                                                    </>
                                                ) : (
                                                    <>
                                                        <FaCheck size={12} /> Save grade
                                                    </>
                                                )}
                                            </Button>
                                            {row.saved ? (
                                                <span className="text-xs font-bold text-emerald-600">
                                                    Saved
                                                </span>
                                            ) : null}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
