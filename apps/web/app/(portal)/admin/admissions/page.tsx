"use client";

// app/(portal)/admin/admissions/page.tsx — review queue: approve (enrolls
// student + returns generated login) or reject. The showcase workflow.

import * as React from "react";
import { motion } from "motion/react";
import { FaUserCheck, FaCheck, FaXmark, FaSpinner } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { api, RequestError } from "@/lib/api";

interface Application {
    id: string;
    formData: Record<string, string>;
    status: string;
    submittedAt: string;
    reviewNote: string | null;
}
interface ReviewResult { status: string; admissionNo?: string; rollNo?: number; email?: string; generatedPassword?: string }

const STATUS_STYLE: Record<string, string> = {
    SUBMITTED: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    APPROVED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    REJECTED: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

export default function AdminAdmissionsPage() {
    const [apps, setApps] = React.useState<Application[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [busyId, setBusyId] = React.useState<string | null>(null);
    const [result, setResult] = React.useState<ReviewResult | null>(null);
    const [feedback, setFeedback] = React.useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    const load = React.useCallback(() => {
        api<{ data: Application[] }>("/admissions")
            .then((p) => setApps(p.data))
            .catch(() => setApps([]))
            .finally(() => setLoading(false));
    }, []);

    React.useEffect(() => { load(); }, [load]);

    async function review(id: string, decision: "APPROVED" | "REJECTED") {
        setBusyId(id);
        setFeedback(null);
        try {
            const res = await api<{ data: ReviewResult }>(`/admissions/${id}/review`, {
                method: "POST",
                body: { decision },
            });
            setResult(res.data);
            setFeedback({ kind: "ok", msg: decision === "APPROVED" ? "Application approved & student enrolled" : "Application rejected" });
            load();
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Review failed" });
        } finally {
            setBusyId(null);
        }
    }

    if (loading) return <div className="space-y-6"><PageHeader title="Admissions" icon={FaUserCheck} /><Skeleton className="h-32" /></div>;

    const pending = apps.filter((a) => a.status === "SUBMITTED");
    const reviewed = apps.filter((a) => a.status !== "SUBMITTED");

    return (
        <div className="space-y-6">
            <PageHeader title="Admissions" subtitle={`${pending.length} pending review`} icon={FaUserCheck} />

            {feedback ? (
                <div className={`p-4 text-xs font-bold text-center uppercase tracking-wide rounded-xl shadow-sm border ${feedback.kind === "ok" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                    {feedback.msg}
                </div>
            ) : null}

            {pending.length === 0 ? (
                <EmptyState title="No pending applications" description="New applications will appear here." />
            ) : (
                pending.map((app) => (
                    <motion.div key={app.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="border-border/60 shadow-sm">
                            <CardHeader className="border-b border-border/60 pb-4 flex flex-row items-center justify-between">
                                <CardTitle className="text-lg font-black uppercase tracking-tight">{app.formData.studentName ?? "Applicant"}</CardTitle>
                                <Badge className={STATUS_STYLE[app.status]}>{app.status}</Badge>
                            </CardHeader>
                            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 text-sm">
                                    <p><span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Guardian: </span>{app.formData.guardianName}</p>
                                    <p><span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Phone: </span>{app.formData.phone}</p>
                                    <p><span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Email: </span>{app.formData.email}</p>
                                    <p><span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Class: </span>{app.formData.classWanted}</p>
                                    <p className="text-[10px] text-muted-foreground">Submitted {new Date(app.submittedAt).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-3 md:justify-end">
                                    <Button onClick={() => review(app.id, "APPROVED")} disabled={busyId === app.id}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider">
                                        {busyId === app.id ? <FaSpinner className="animate-spin" size={12} /> : <FaCheck size={12} />} Approve & Enroll
                                    </Button>
                                    <Button onClick={() => review(app.id, "REJECTED")} disabled={busyId === app.id} variant="outline"
                                        className="text-destructive border-destructive/20 hover:bg-destructive/10 font-black text-xs uppercase tracking-wider">
                                        <FaXmark size={12} /> Reject
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))
            )}

            {reviewed.length > 0 ? (
                <>
                    <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mt-4">Reviewed</h2>
                    {reviewed.map((app) => (
                        <Card key={app.id} className="border-border/60 shadow-sm opacity-70">
                            <CardContent className="p-5 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold">{app.formData.studentName}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{app.formData.classWanted}</p>
                                </div>
                                <Badge className={STATUS_STYLE[app.status]}>{app.status}</Badge>
                            </CardContent>
                        </Card>
                    ))}
                </>
            ) : null}

            <Dialog open={!!result} onOpenChange={(o) => !o && setResult(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle className="font-black uppercase tracking-tight">Student Enrolled</DialogTitle></DialogHeader>
                    {result ? (
                        <div className="space-y-3">
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                                <p className="text-sm"><span className="font-black">Admission No:</span> {result.admissionNo}</p>
                                <p className="text-sm"><span className="font-black">Roll:</span> {result.rollNo}</p>
                                <p className="text-sm"><span className="font-black">Login email:</span> {result.email}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Generated password (show once)</p>
                                <p className="text-lg font-black font-mono mt-1">{result.generatedPassword}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">Share with the student; they can change it later.</p>
                            </div>
                            <Button onClick={() => setResult(null)} className="w-full font-black text-xs uppercase tracking-wider">Done</Button>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    );
}
