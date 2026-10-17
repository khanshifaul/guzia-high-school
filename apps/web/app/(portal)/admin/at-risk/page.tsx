"use client";

// app/(portal)/admin/at-risk/page.tsx — AI at-risk board: recompute, model
// card, sortable table with score bars + top contributing factors.

import * as React from "react";
import { motion } from "motion/react";
import { FaBrain, FaArrowsRotate, FaSpinner } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { api, RequestError } from "@/lib/api";

interface Contribution { feature: string; value: number; contribution: number; direction: "risk" | "safe" }
interface RiskRow {
    studentId: string; fullName: string; className: string; sectionName: string | null;
    score: number; atRisk: boolean; factors: Record<string, number>; contributions: Contribution[];
}
interface Board { threshold: number; trainedAt: string | null; metrics: Record<string, number> | null; rows: RiskRow[] }

const FEATURE_LABEL: Record<string, string> = {
    attendanceRate: "Attendance",
    invLateRate: "Punctuality",
    gpaTrend: "GPA trend",
    submissionRate: "Submissions",
    invOverdueFee: "Fee status",
};

function riskBadge(score: number, threshold: number) {
    if (score >= 0.7) return "bg-rose-500/10 text-rose-600 border-rose-500/20";
    if (score >= threshold) return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
}

export default function AdminAtRiskPage() {
    const [board, setBoard] = React.useState<Board | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [recomputing, setRecomputing] = React.useState(false);
    const [feedback, setFeedback] = React.useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    const load = React.useCallback(() => {
        api<Board>("/ai/at-risk")
            .then(setBoard)
            .catch(() => setBoard(null))
            .finally(() => setLoading(false));
    }, []);

    React.useEffect(() => { load(); }, [load]);

    async function recompute() {
        setRecomputing(true);
        setFeedback(null);
        try {
            const res = await api<{ scored: number; flagged: number }>("/ai/at-risk/recompute", { method: "POST" });
            setFeedback({ kind: "ok", msg: `Scored ${res.scored} students, ${res.flagged} flagged at-risk` });
            load();
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Recompute failed" });
        } finally {
            setRecomputing(false);
        }
    }

    if (loading) return <div className="space-y-6"><PageHeader title="At-Risk Board" icon={FaBrain} /><Skeleton className="h-32" /><Skeleton className="h-64" /></div>;

    const flagged = board?.rows.filter((r) => r.atRisk) ?? [];
    const others = board?.rows.filter((r) => !r.atRisk) ?? [];

    return (
        <div className="space-y-6">
            <PageHeader title="At-Risk Board" subtitle="AI early-warning: flag students who need intervention"
                icon={FaBrain}
                actions={
                    <Button onClick={recompute} disabled={recomputing}
                        className="font-black text-xs uppercase tracking-wider">
                        {recomputing ? <><FaSpinner className="animate-spin" size={12} /> Recomputing…</> : <><FaArrowsRotate size={12} /> Recompute Scores</>}
                    </Button>
                } />

            {feedback ? (
                <div className={`p-4 text-xs font-bold text-center uppercase tracking-wide rounded-xl shadow-sm border ${feedback.kind === "ok" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                    {feedback.msg}
                </div>
            ) : null}

            {board?.metrics ? (
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="border-b border-border/60 pb-4">
                        <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Model (holdout evaluation)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 flex flex-wrap gap-6">
                        <div><p className="text-2xl font-black text-primary">{board.metrics.holdoutAccuracy}</p><p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Accuracy</p></div>
                        <div><p className="text-2xl font-black text-primary">{board.metrics.precision}</p><p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Precision</p></div>
                        <div><p className="text-2xl font-black text-primary">{board.metrics.recall}</p><p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Recall</p></div>
                        <div><p className="text-2xl font-black text-primary">{board.metrics.f1}</p><p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">F1</p></div>
                        <div><p className="text-2xl font-black text-primary">{board.metrics.auc}</p><p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">AUC</p></div>
                        <div><p className="text-2xl font-black text-primary">{board.threshold}</p><p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Threshold</p></div>
                    </CardContent>
                </Card>
            ) : null}

            {board && board.rows.length === 0 ? (
                <EmptyState title="No scores yet" description="Click Recompute Scores to run the AI classifier." />
            ) : (
                <>
                    <h2 className="text-[10px] font-black text-rose-600 uppercase tracking-wider">Flagged at-risk ({flagged.length})</h2>
                    {flagged.length === 0 ? (
                        <Card className="border-border/60 shadow-sm"><CardContent className="p-6 text-sm text-muted-foreground">No students currently flagged. Good sign.</CardContent></Card>
                    ) : (
                        <Card className="border-border/60 shadow-sm">
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Student</TableHead>
                                            <TableHead>Class</TableHead>
                                            <TableHead className="w-40">Score</TableHead>
                                            <TableHead>Risk level</TableHead>
                                            <TableHead>Top factors</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {flagged.map((r, i) => (
                                            <motion.tr key={r.studentId} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
                                                <TableCell className="font-semibold">{r.fullName}</TableCell>
                                                <TableCell className="text-xs">{r.className}{r.sectionName ? `-${r.sectionName}` : ""}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                                            <div className="h-full bg-rose-500" style={{ width: `${Math.round(r.score * 100)}%` }} />
                                                        </div>
                                                        <span className="text-xs font-black">{(r.score * 100).toFixed(0)}%</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell><Badge className={riskBadge(r.score, board?.threshold ?? 0.5)}>{r.score >= 0.7 ? "HIGH" : "MEDIUM"}</Badge></TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {r.contributions.slice(0, 3).map((c) => (
                                                            <Badge key={c.feature} className={`text-[9px] ${c.direction === "risk" ? "bg-rose-500/10 text-rose-600 border-rose-500/20" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"}`}>
                                                                {FEATURE_LABEL[c.feature] ?? c.feature} {c.direction === "risk" ? "↓" : "↑"}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                            </motion.tr>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {others.length > 0 ? (
                        <>
                            <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mt-4">Others ({others.length})</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {others.map((r) => (
                                    <Card key={r.studentId} className="border-border/60 shadow-sm">
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-semibold">{r.fullName}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{r.className}</p>
                                            </div>
                                            <span className="text-xs font-black text-emerald-600">{(r.score * 100).toFixed(0)}%</span>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </>
                    ) : null}
                </>
            )}
        </div>
    );
}
