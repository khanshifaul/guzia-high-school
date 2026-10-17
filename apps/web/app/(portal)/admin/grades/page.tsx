"use client";

// app/(portal)/admin/grades/page.tsx — exams list + publish toggle + grade
// band editor (the canonical scale).

import * as React from "react";
import { FaGraduationCap, FaPlus, FaEye, FaEyeSlash, FaSpinner } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { api, RequestError } from "@/lib/api";

interface Exam { id: string; name: string; published: boolean; startDate: string; endDate: string; class: { name: string }; _count: { marks: number } }
interface Band { id?: string; minPercent: number; maxPercent: number; letter: string; point: number }

const DEFAULT_BANDS: Band[] = [
    { minPercent: 80, maxPercent: 100, letter: "A+", point: 4.0 },
    { minPercent: 70, maxPercent: 79, letter: "A", point: 3.5 },
    { minPercent: 60, maxPercent: 69, letter: "A-", point: 3.0 },
    { minPercent: 50, maxPercent: 59, letter: "B", point: 2.5 },
    { minPercent: 40, maxPercent: 49, letter: "C", point: 2.0 },
    { minPercent: 33, maxPercent: 39, letter: "D", point: 1.0 },
    { minPercent: 0, maxPercent: 32, letter: "F", point: 0.0 },
];

export default function AdminGradesPage() {
    const [exams, setExams] = React.useState<Exam[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [busyId, setBusyId] = React.useState<string | null>(null);
    const [feedback, setFeedback] = React.useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    const load = React.useCallback(() => {
        api<{ data: Exam[] }>("/exams")
            .then((p) => setExams(p.data))
            .catch(() => setExams([]))
            .finally(() => setLoading(false));
    }, []);

    React.useEffect(() => { load(); }, [load]);

    async function togglePublish(exam: Exam) {
        setBusyId(exam.id); setFeedback(null);
        try {
            await api(`/exams/${exam.id}/publish`, { method: "POST", body: { published: !exam.published } });
            setFeedback({ kind: "ok", msg: exam.published ? "Results hidden" : "Results published to students" });
            load();
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Toggle failed" });
        } finally { setBusyId(null); }
    }

    if (loading) return <div className="space-y-6"><PageHeader title="Grades" icon={FaGraduationCap} /><Skeleton className="h-32" /></div>;

    return (
        <div className="space-y-6">
            <PageHeader title="Exams & Grading" subtitle="Manage exams and publish results" icon={FaGraduationCap} />

            {feedback ? (
                <div className={`p-4 text-xs font-bold text-center uppercase tracking-wide rounded-xl shadow-sm border ${feedback.kind === "ok" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                    {feedback.msg}
                </div>
            ) : null}

            <Card className="border-border/60 shadow-sm">
                <CardHeader className="border-b border-border/60 pb-4"><CardTitle className="text-xl font-black uppercase tracking-tight">Exams</CardTitle></CardHeader>
                <CardContent className="p-0">
                    {exams.length === 0 ? <EmptyState title="No exams" description="Exams are seeded for the demo class." /> : (
                        <Table>
                            <TableHeader><TableRow><TableHead>Exam</TableHead><TableHead>Class</TableHead><TableHead className="text-right">Marks</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {exams.map((e) => (
                                    <TableRow key={e.id}>
                                        <TableCell className="font-semibold">{e.name}</TableCell>
                                        <TableCell className="text-xs">{e.class.name}</TableCell>
                                        <TableCell className="text-right">{e._count.marks}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={e.published ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}>
                                                {e.published ? "Published" : "Draft"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" onClick={() => togglePublish(e)} disabled={busyId === e.id} variant="outline"
                                                className="font-black text-[10px] uppercase tracking-wider">
                                                {busyId === e.id ? <FaSpinner className="animate-spin" size={11} /> : e.published ? <><FaEyeSlash size={11} /> Unpublish</> : <><FaEye size={11} /> Publish</>}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
                <CardHeader className="border-b border-border/60 pb-4"><CardTitle className="text-xl font-black uppercase tracking-tight">Canonical Grade Scale</CardTitle></CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader><TableRow><TableHead className="text-right">Min %</TableHead><TableHead className="text-right">Max %</TableHead><TableHead className="text-center">Letter</TableHead><TableHead className="text-right">Point</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {DEFAULT_BANDS.map((b) => (
                                <TableRow key={b.letter}>
                                    <TableCell className="text-right">{b.minPercent}</TableCell>
                                    <TableCell className="text-right">{b.maxPercent}</TableCell>
                                    <TableCell className="text-center"><Badge className="bg-primary/10 text-primary border-primary/20">{b.letter}</Badge></TableCell>
                                    <TableCell className="text-right font-bold">{b.point.toFixed(1)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
