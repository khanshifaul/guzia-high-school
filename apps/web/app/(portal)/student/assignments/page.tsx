"use client";

// app/(portal)/student/assignments/page.tsx — view assignments for the
// student's class + submit work (one submission per assignment).

import * as React from "react";
import { motion } from "motion/react";
import { FaListCheck, FaPaperPlane } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { api, RequestError } from "@/lib/api";
import { useMyStudent } from "@/lib/student-session";

interface Assignment {
    id: string;
    title: string;
    description: string | null;
    dueDate: string;
    subject: { name: string };
    teacher: { user: { fullName: string } } | null;
    _count: { submissions: number };
}

export default function StudentAssignmentsPage() {
    const { studentId, classId, loading: loadingMe } = useMyStudent();
    const [assignments, setAssignments] = React.useState<Assignment[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [openSubmit, setOpenSubmit] = React.useState<string | null>(null);
    const [content, setContent] = React.useState("");
    const [busy, setBusy] = React.useState(false);
    const [feedback, setFeedback] = React.useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    const load = React.useCallback(() => {
        if (!classId) return;
        api<{ data: Assignment[] }>(`/assignments/class/${classId}`)
            .then((p) => setAssignments(p.data))
            .catch(() => setAssignments([]))
            .finally(() => setLoading(false));
    }, [classId]);

    React.useEffect(() => { load(); }, [load]);

    async function submit(assignmentId: string) {
        setBusy(true);
        setFeedback(null);
        try {
            await api(`/assignments/${assignmentId}/submit`, { method: "POST", body: { content } });
            setFeedback({ kind: "ok", msg: "Submitted successfully" });
            setOpenSubmit(null);
            setContent("");
            load();
        } catch (err) {
            const msg = err instanceof RequestError ? err.messages.join("; ") : "Submit failed";
            setFeedback({ kind: "err", msg });
        } finally {
            setBusy(false);
        }
    }

    if (loadingMe || loading) {
        return <div className="space-y-6"><PageHeader title="Assignments" icon={FaListCheck} /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>;
    }
    if (!classId) return <EmptyState title="No class assigned" description="Your account is not linked to a class." />;

    return (
        <div className="space-y-6">
            <PageHeader title="Assignments" subtitle="Work assigned to your class" icon={FaListCheck} />

            {feedback ? (
                <div className={`p-4 text-xs font-bold text-center uppercase tracking-wide rounded-xl shadow-sm border ${feedback.kind === "ok" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                    {feedback.msg}
                </div>
            ) : null}

            {assignments.length === 0 ? (
                <EmptyState title="No assignments" description="Your teachers have not assigned any work yet." />
            ) : (
                assignments.map((a) => {
                    const overdue = new Date(a.dueDate) < new Date();
                    return (
                        <motion.div key={a.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                            <Card className="border-border/60 shadow-sm">
                                <CardHeader className="border-b border-border/60 pb-4 flex flex-row items-start justify-between gap-3">
                                    <div>
                                        <CardTitle className="text-lg font-black uppercase tracking-tight">{a.title}</CardTitle>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mt-1">
                                            {a.subject.name} · {a.teacher?.user.fullName ?? ""}
                                        </p>
                                    </div>
                                    <Badge className={overdue ? "bg-rose-500/10 text-rose-600 border-rose-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}>
                                        Due {new Date(a.dueDate).toLocaleDateString()}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    {a.description ? <p className="text-sm text-muted-foreground">{a.description}</p> : null}
                                    {openSubmit === a.id ? (
                                        <div className="space-y-3">
                                            <Textarea value={content} onChange={(e) => setContent(e.target.value)}
                                                placeholder="Type your answer / work…" rows={4} />
                                            <div className="flex gap-2">
                                                <Button onClick={() => submit(a.id)} disabled={busy || !content.trim()}
                                                    className="font-black text-xs uppercase tracking-wider">
                                                    <FaPaperPlane size={12} /> {busy ? "Submitting…" : "Submit"}
                                                </Button>
                                                <Button variant="outline" onClick={() => setOpenSubmit(null)}
                                                    className="font-black text-xs uppercase tracking-wider">Cancel</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button variant="outline" onClick={() => setOpenSubmit(a.id)}
                                            className="font-black text-xs uppercase tracking-wider">
                                            Submit Work
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })
            )}
        </div>
    );
}
