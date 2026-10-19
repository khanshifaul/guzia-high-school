"use client";

// app/(portal)/admin/grades/page.tsx — exams list + create, publish toggle,
// and the canonical grade-scale editor.
//
// The grade scale is the single source of truth for grading (specs/06 §1),
// so it is read from the server rather than hardcoded here, and editing it
// writes the whole set back. The server rejects a set that is not contiguous
// or does not cover 0–100, and says why.

import * as React from "react";
import {
    FaGraduationCap,
    FaEye,
    FaEyeSlash,
    FaPlus,
    FaSpinner,
    FaTrash,
} from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/shared/page-header";
import { api, RequestError } from "@/lib/api";

interface Exam {
    id: string;
    name: string;
    published: boolean;
    startDate: string;
    endDate: string;
    class: { name: string };
    _count: { marks: number };
}
interface Band {
    id?: string;
    minPercent: number;
    maxPercent: number;
    letter: string;
    point: number;
}
interface ClassOption {
    id: string;
    name: string;
}

/** A band row being edited. The values are strings so a half-typed number
 *  does not fight the input. */
interface BandDraft {
    minPercent: string;
    maxPercent: string;
    letter: string;
    point: string;
}

export default function AdminGradesPage() {
    const [exams, setExams] = React.useState<Exam[]>([]);
    const [classes, setClasses] = React.useState<ClassOption[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [busyId, setBusyId] = React.useState<string | null>(null);
    const [feedback, setFeedback] = React.useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    // Grade scale.
    const [drafts, setDrafts] = React.useState<BandDraft[]>([]);

    const [bandsDirty, setBandsDirty] = React.useState(false);
    const [savingBands, setSavingBands] = React.useState(false);

    // New exam.
    const [openExam, setOpenExam] = React.useState(false);
    const [examName, setExamName] = React.useState("");
    const [examClassId, setExamClassId] = React.useState<string | null>(null);
    const [examStart, setExamStart] = React.useState("");
    const [examEnd, setExamEnd] = React.useState("");
    const [busy, setBusy] = React.useState(false);

    const load = React.useCallback(() => {
        api<Exam[]>("/exams")
            .then((p) => setExams(p))
            .catch(() => setExams([]))
            .finally(() => setLoading(false));
    }, []);

    const loadBands = React.useCallback(() => {
        api<Band[]>("/exams/grade-bands")
            .then((p) => {
                setDrafts(
                    p.map((b) => ({
                        minPercent: String(b.minPercent),
                        maxPercent: String(b.maxPercent),
                        letter: b.letter,
                        point: String(b.point),
                    })),
                );
                setBandsDirty(false);
            })
            .catch(() => setDrafts([]));
    }, []);

    React.useEffect(() => { load(); }, [load]);
    React.useEffect(() => { loadBands(); }, [loadBands]);
    React.useEffect(() => {
        api<{ classes: ClassOption[] }>("/classes")
            .then((p) => setClasses(p.classes))
            .catch(() => setClasses([]));
    }, []);

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

    async function createExam() {
        setBusy(true); setFeedback(null);
        try {
            await api("/exams", {
                method: "POST",
                body: { name: examName, classId: examClassId, startDate: examStart, endDate: examEnd },
            });
            setFeedback({ kind: "ok", msg: `Exam "${examName}" created` });
            setOpenExam(false);
            setExamName(""); setExamStart(""); setExamEnd("");
            load();
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Create failed" });
        } finally { setBusy(false); }
    }

    function setDraft(index: number, patch: Partial<BandDraft>) {
        setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
        setBandsDirty(true);
    }

    function addBandRow() {
        const last = drafts[drafts.length - 1];
        const min = last ? Math.max(0, Number(last.maxPercent) - 1) : 0;
        setDrafts((prev) => [
            ...prev,
            { minPercent: String(min), maxPercent: String(min), letter: "", point: "0" },
        ]);
        setBandsDirty(true);
    }

    function removeBandRow(index: number) {
        setDrafts((prev) => prev.filter((_, i) => i !== index));
        setBandsDirty(true);
    }

    async function saveBands() {
        setSavingBands(true); setFeedback(null);
        const payload = drafts.map((d) => ({
            minPercent: Number(d.minPercent),
            maxPercent: Number(d.maxPercent),
            letter: d.letter.trim(),
            point: Number(d.point),
        }));
        try {
            await api("/exams/grade-bands", { method: "PUT", body: payload });
            setFeedback({ kind: "ok", msg: "Grade scale updated — it applies to every result" });
            loadBands();
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Save failed" });
        } finally { setSavingBands(false); }
    }

    if (loading) return <div className="space-y-6"><PageHeader title="Grades" icon={FaGraduationCap} /><Skeleton className="h-32" /></div>;

    return (
        <div className="space-y-6">
            <PageHeader title="Exams & Grading" subtitle="Manage exams and publish results" icon={FaGraduationCap}
                actions={
                    <Dialog open={openExam} onOpenChange={setOpenExam}>
                        <DialogTrigger asChild>
                            <Button className="font-black text-xs uppercase tracking-wider">
                                <FaPlus size={12} /> New Exam
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle className="font-black uppercase tracking-tight">New Exam</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <Input placeholder="Name (e.g. Final Term 2026)" value={examName}
                                    onChange={(e) => setExamName(e.target.value)} className="h-11" />
                                <div>
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Class</label>
                                    <Select value={examClassId ?? undefined} onValueChange={setExamClassId}>
                                        <SelectTrigger className="h-11 mt-1"><SelectValue placeholder="Select class" /></SelectTrigger>
                                        <SelectContent>
                                            {classes.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Start date</label>
                                        <Input type="date" value={examStart} onChange={(e) => setExamStart(e.target.value)} className="h-11 mt-1" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">End date</label>
                                        <Input type="date" value={examEnd} onChange={(e) => setExamEnd(e.target.value)} className="h-11 mt-1" />
                                    </div>
                                </div>
                                <Button onClick={createExam}
                                    disabled={busy || !examName || !examClassId || !examStart || !examEnd}
                                    className="w-full h-11 font-black text-xs uppercase tracking-wider">
                                    {busy ? <FaSpinner className="animate-spin" size={12} /> : "Create"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                } />

            {feedback ? (
                <div className={`p-4 text-xs font-bold text-center uppercase tracking-wide rounded-xl shadow-sm border ${feedback.kind === "ok" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                    {feedback.msg}
                </div>
            ) : null}

            <Card className="border-border/60 shadow-sm">
                <CardHeader className="border-b border-border/60 pb-4"><CardTitle className="text-xl font-black uppercase tracking-tight">Exams</CardTitle></CardHeader>
                <CardContent className="p-0">
                    {exams.length === 0 ? <EmptyState title="No exams" description="Create one to start entering marks." /> : (
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
                <CardHeader className="border-b border-border/60 pb-4 flex flex-row items-center justify-between gap-3">
                    <div>
                        <CardTitle className="text-xl font-black uppercase tracking-tight">Canonical Grade Scale</CardTitle>
                        <p className="text-[10px] text-muted-foreground mt-1">
                            Every result is graded with this scale. It must cover 0–100 with no gaps or overlaps.
                        </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <Button size="sm" variant="outline" onClick={addBandRow}
                            className="font-black text-[10px] uppercase tracking-wider cursor-pointer">
                            <FaPlus size={11} /> Band
                        </Button>
                        <Button size="sm" onClick={saveBands} disabled={!bandsDirty || savingBands}
                            className="font-black text-[10px] uppercase tracking-wider cursor-pointer">
                            {savingBands ? <FaSpinner className="animate-spin" size={11} /> : "Save scale"}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {drafts.length === 0 ? (
                        <EmptyState title="No grade bands" description="Add one to start grading." />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right w-28">Min %</TableHead>
                                    <TableHead className="text-right w-28">Max %</TableHead>
                                    <TableHead className="text-center w-28">Letter</TableHead>
                                    <TableHead className="text-right w-28">Point</TableHead>
                                    <TableHead className="w-16" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {drafts.map((d, i) => (
                                    <TableRow key={i}>
                                        <TableCell>
                                            <Input type="number" min={0} max={100} value={d.minPercent}
                                                onChange={(e) => setDraft(i, { minPercent: e.target.value })}
                                                className="h-9 text-right" />
                                        </TableCell>
                                        <TableCell>
                                            <Input type="number" min={0} max={100} value={d.maxPercent}
                                                onChange={(e) => setDraft(i, { maxPercent: e.target.value })}
                                                className="h-9 text-right" />
                                        </TableCell>
                                        <TableCell>
                                            <Input value={d.letter} maxLength={3}
                                                onChange={(e) => setDraft(i, { letter: e.target.value })}
                                                placeholder="A+" className="h-9 text-center font-black uppercase" />
                                        </TableCell>
                                        <TableCell>
                                            <Input type="number" step={0.1} min={0} max={4} value={d.point}
                                                onChange={(e) => setDraft(i, { point: e.target.value })}
                                                className="h-9 text-right" />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button size="icon" variant="ghost" onClick={() => removeBandRow(i)}
                                                aria-label={`Remove band ${d.letter || i + 1}`}
                                                className="text-muted-foreground hover:text-destructive cursor-pointer">
                                                <FaTrash size={11} />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
