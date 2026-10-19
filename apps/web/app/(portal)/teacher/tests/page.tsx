"use client";

// app/(portal)/teacher/tests/page.tsx — AI test papers: generate from a
// blueprint, view grouped questions with answer key, print.

import * as React from "react";
import { motion } from "motion/react";
import { FaClipboardList, FaPlus, FaSpinner, FaPrint, FaEye, FaEyeSlash } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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

interface ClassOption { id: string; name: string; subjects: { subject: { id: string; name: string }; teacher?: { id: string } | null }[] }
interface Question { id: string; type: string; text: string; options: string[] | null; answer: string; explanation: string | null; difficulty: string; marks: number; order: number }
interface Paper { id: string; title: string; durationMinutes: number; totalMarks: number; status: string; questions: Question[]; class: { name: string }; subject: { name: string }; _count?: { questions: number } }

export default function TeacherTestsPage() {
    const { teacherId } = useMyTeacher();
    const [classes, setClasses] = React.useState<ClassOption[]>([]);
    const [papers, setPapers] = React.useState<Paper[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [detail, setDetail] = React.useState<Paper | null>(null);
    const [showAnswers, setShowAnswers] = React.useState(false);

    const [open, setOpen] = React.useState(false);
    const [classId, setClassId] = React.useState<string | null>(null);
    const [subjectId, setSubjectId] = React.useState<string | null>(null);
    const [topics, setTopics] = React.useState("");
    const [mcq, setMcq] = React.useState("10");
    const [short, setShort] = React.useState("5");
    const [longQ, setLongQ] = React.useState("3");
    const [duration, setDuration] = React.useState("90");
    const [busy, setBusy] = React.useState(false);
    const [feedback, setFeedback] = React.useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    const selectedClass = classes.find((c) => c.id === classId);
    const totalMarks = Number(mcq) * 1 + Number(short) * 2 + Number(longQ) * 5;

    const load = React.useCallback(() => {
        api<Paper[]>("/ai/tests")
            .then((p) => setPapers(p))
            .catch(() => setPapers([]))
            .finally(() => setLoading(false));
    }, []);

    React.useEffect(() => {
        if (!teacherId) return;
        api<{ classes: ClassOption[] }>("/classes")
            .then((p) => {
                const mine = myClasses(p.classes, teacherId);
                setClasses(mine);
                setClassId((prev) => (prev && mine.some((c) => c.id === prev) ? prev : (mine[0]?.id ?? null)));
            })
            .catch(() => setClasses([]));
        load();
    }, [load, teacherId]);

    // Prefill topics when arriving from a source ("Make test paper").
    React.useEffect(() => {
        const t = new URLSearchParams(window.location.search).get("topics");
        if (t) { setTopics(t); setOpen(true); }
    }, []);

    async function generate() {
        setBusy(true);
        setFeedback(null);
        try {
            await api("/ai/tests/generate", {
                method: "POST",
                body: {
                    classId, subjectId,
                    topics: topics.split(",").map((t) => t.trim()).filter(Boolean),
                    mcq: Number(mcq), short: Number(short), long: Number(longQ),
                    totalMarks, durationMinutes: Number(duration),
                },
            });
            setFeedback({ kind: "ok", msg: "Paper generated" });
            setOpen(false);
            load();
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Generate failed" });
        } finally {
            setBusy(false);
        }
    }

    async function openDetail(id: string) {
        const p = await api<Paper>(`/ai/tests/${id}`);
        setDetail(p);
        setShowAnswers(false);
    }

    if (loading) return <div className="space-y-6"><PageHeader title="Test Papers" icon={FaClipboardList} /><Skeleton className="h-32" /></div>;

    return (
        <div className="space-y-6">
            <PageHeader title="Test Papers" subtitle="AI-generated papers you can review & print" icon={FaClipboardList}
                actions={
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button className="font-black text-xs uppercase tracking-wider"><FaPlus size={12} /> Generate Paper</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader><DialogTitle className="font-black uppercase tracking-tight">Generate Test Paper (AI)</DialogTitle></DialogHeader>
                            <div className="space-y-4">
                                <Select value={classId ?? undefined} onValueChange={(v) => { setClassId(v); setSubjectId(null); }}>
                                    <SelectTrigger className="h-11"><SelectValue placeholder="Class" /></SelectTrigger>
                                    <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <Select value={subjectId ?? undefined} onValueChange={setSubjectId}>
                                    <SelectTrigger className="h-11"><SelectValue placeholder="Subject" /></SelectTrigger>
                                    <SelectContent>{dedupeSubjects(selectedClass?.subjects).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <Input placeholder="Topics (comma-separated)" value={topics} onChange={(e) => setTopics(e.target.value)} className="h-11" />
                                <div className="grid grid-cols-4 gap-2">
                                    <Input type="number" min={0} value={mcq} onChange={(e) => setMcq(e.target.value)} className="h-11" placeholder="MCQ" title="MCQ count" />
                                    <Input type="number" min={0} value={short} onChange={(e) => setShort(e.target.value)} className="h-11" placeholder="Short" title="Short count" />
                                    <Input type="number" min={0} value={longQ} onChange={(e) => setLongQ(e.target.value)} className="h-11" placeholder="Long" title="Long count" />
                                    <Input type="number" min={10} value={duration} onChange={(e) => setDuration(e.target.value)} className="h-11" placeholder="Mins" title="Duration minutes" />
                                </div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                                    Total marks: {totalMarks} (MCQ×1 + Short×2 + Long×5)
                                </p>
                                <Button onClick={generate} disabled={busy || !subjectId || !topics} className="w-full h-11 font-black text-xs uppercase tracking-wider">
                                    {busy ? <><FaSpinner className="animate-spin" size={12} /> Generating…</> : "Generate with AI"}
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

            {papers.length === 0 ? (
                <EmptyState title="No papers yet" description="Generate your first AI test paper." />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {papers.map((p) => (
                        <motion.div key={p.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                            <Card className="border-border/60 shadow-sm">
                                <CardHeader className="border-b border-border/60 pb-4">
                                    <CardTitle className="text-lg font-black uppercase tracking-tight">{p.title}</CardTitle>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mt-1">
                                        {p.class.name} · {p.subject.name} · {p.totalMarks} marks · {p.durationMinutes} min
                                    </p>
                                </CardHeader>
                                <CardContent className="p-5 flex gap-2">
                                    <Button size="sm" onClick={() => openDetail(p.id)} className="font-black text-[10px] uppercase tracking-wider"><FaEye size={11} /> View</Button>
                                    <Button size="sm" variant="outline" onClick={() => { openDetail(p.id).then(() => setTimeout(() => window.print(), 300)); }}
                                        className="font-black text-[10px] uppercase tracking-wider"><FaPrint size={11} /> Print</Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}

            <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase tracking-tight">
                            {detail?.title}
                            <span className="block text-[10px] text-muted-foreground font-semibold mt-1 normal-case tracking-normal">
                                {detail?.class.name} · {detail?.subject.name} · {detail?.totalMarks} marks · {detail?.durationMinutes} minutes
                            </span>
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex justify-end">
                        <Button size="sm" variant="outline" onClick={() => setShowAnswers((s) => !s)} className="font-black text-[10px] uppercase tracking-wider">
                            {showAnswers ? <FaEyeSlash size={11} /> : <FaEye size={11} />} {showAnswers ? "Hide" : "Show"} Answer Key
                        </Button>
                    </div>
                    {(["MCQ", "SHORT", "LONG"] as const).map((type) => {
                        const qs = detail?.questions.filter((q) => q.type === type) ?? [];
                        if (qs.length === 0) return null;
                        return (
                            <div key={type}>
                                <p className="text-[10px] font-black text-primary uppercase tracking-wider mb-2">
                                    {type === "MCQ" ? "Multiple Choice" : type === "SHORT" ? "Short Answer" : "Long Answer"} ({qs[0].marks} marks each)
                                </p>
                                <div className="space-y-3">
                                    {qs.map((q, i) => (
                                        <div key={q.id} className="p-3 rounded-lg border border-border/60">
                                            <p className="text-sm font-semibold">{i + 1}. {q.text}</p>
                                            {q.options ? (
                                                <ul className="mt-1 space-y-0.5">
                                                    {q.options.map((o, oi) => (
                                                        <li key={oi} className="text-xs text-muted-foreground">{String.fromCharCode(97 + oi)}) {o}</li>
                                                    ))}
                                                </ul>
                                            ) : null}
                                            {showAnswers ? (
                                                <div className="mt-2 p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                                                    <p className="text-xs font-bold text-emerald-600">Answer: {q.answer}</p>
                                                    {q.explanation ? <p className="text-[11px] text-muted-foreground mt-0.5">{q.explanation}</p> : null}
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                    <p className="text-[9px] text-muted-foreground text-center uppercase tracking-wider">AI-generated — verify before use</p>
                </DialogContent>
            </Dialog>
        </div>
    );
}
