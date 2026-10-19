"use client";

// app/(portal)/teacher/assignments/page.tsx — list assignments for a class,
// create one, and grade submissions.

import * as React from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { FaListCheck, FaPlus, FaSpinner } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
interface Assignment {
    id: string; title: string; description: string | null; dueDate: string;
    subject: { name: string }; submissions: { grade: number | null }[];
}

export default function TeacherAssignmentsPage() {
    const { teacherId } = useMyTeacher();
    const [classes, setClasses] = React.useState<ClassOption[]>([]);
    const [classId, setClassId] = React.useState<string | null>(null);
    const [assignments, setAssignments] = React.useState<Assignment[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [loadingList, setLoadingList] = React.useState(false);

    // Create form state.
    const [open, setOpen] = React.useState(false);
    const [title, setTitle] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [subjectId, setSubjectId] = React.useState<string | null>(null);
    const [dueDate, setDueDate] = React.useState("");
    const [busy, setBusy] = React.useState(false);
    const [feedback, setFeedback] = React.useState<{ kind: "ok" | "err"; msg: string } | null>(null);

    React.useEffect(() => {
        if (!teacherId) return;
        api<{ classes: ClassOption[] }>("/classes")
            .then((p) => {
                const mine = myClasses(p.classes, teacherId);
                setClasses(mine);
                setClassId((prev) => (prev && mine.some((c) => c.id === prev) ? prev : (mine[0]?.id ?? null)));
            })
            .catch(() => setClasses([]))
            .finally(() => setLoading(false));
    }, [teacherId]);

    const selectedClass = classes.find((c) => c.id === classId);

    React.useEffect(() => {
        if (!classId) return;
        setLoadingList(true);
        api<Assignment[]>(`/assignments/class/${classId}`)
            .then((p) => setAssignments(p))
            .catch(() => setAssignments([]))
            .finally(() => setLoadingList(false));
    }, [classId]);

    async function create() {
        setBusy(true);
        setFeedback(null);
        try {
            await api("/assignments", {
                method: "POST",
                body: { title, description: description || undefined, subjectId, classId, dueDate },
            });
            setFeedback({ kind: "ok", msg: "Assignment created" });
            setOpen(false);
            setTitle(""); setDescription(""); setSubjectId(null); setDueDate("");
            if (classId) {
                const p = await api<Assignment[]>(`/assignments/class/${classId}`);
                setAssignments(p);
            }
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Create failed" });
        } finally {
            setBusy(false);
        }
    }

    if (loading) return <div className="space-y-6"><PageHeader title="Assignments" icon={FaListCheck} /><Skeleton className="h-32" /></div>;

    return (
        <div className="space-y-6">
            <PageHeader title="Assignments" subtitle="Create and grade class work" icon={FaListCheck}
                actions={
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button className="font-black text-xs uppercase tracking-wider"><FaPlus size={12} /> New Assignment</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader><DialogTitle className="font-black uppercase tracking-tight">New Assignment</DialogTitle></DialogHeader>
                            <div className="space-y-4">
                                <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-11" />
                                <Textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                                <Select value={subjectId ?? undefined} onValueChange={setSubjectId}>
                                    <SelectTrigger className="h-11"><SelectValue placeholder="Subject" /></SelectTrigger>
                                    <SelectContent>
                                        {dedupeSubjects(selectedClass?.subjects).map((s) => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-11" />
                                <Button onClick={create} disabled={busy || !title || !subjectId || !dueDate} className="w-full h-11 font-black text-xs uppercase tracking-wider">
                                    {busy ? <><FaSpinner className="animate-spin" size={12} /> Creating…</> : "Create"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                } />

            <div className="max-w-sm space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Class</label>
                <Select value={classId ?? undefined} onValueChange={setClassId}>
                    <SelectTrigger className="h-11 text-xs font-semibold"><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                        {classes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                    </SelectContent>
                </Select>
            </div>

            {feedback ? (
                <div className={`p-4 text-xs font-bold text-center uppercase tracking-wide rounded-xl shadow-sm border ${feedback.kind === "ok" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                    {feedback.msg}
                </div>
            ) : null}

            {loadingList ? (
                <Skeleton className="h-32" />
            ) : assignments.length === 0 ? (
                <EmptyState title="No assignments" description="Create one for this class." />
            ) : (
                assignments.map((a) => (
                    <motion.div key={a.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="border-border/60 shadow-sm">
                            <CardHeader className="border-b border-border/60 pb-4 flex flex-row items-center justify-between">
                                <CardTitle className="text-lg font-black uppercase tracking-tight">{a.title}</CardTitle>
                                <div className="flex gap-2">
                                    <Badge className="bg-primary/10 text-primary border-primary/20">{a.subject.name}</Badge>
                                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">{a.submissions.length} submissions</Badge>
                                    {a.submissions.some((s) => s.grade === null) ? (
                                        <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20">
                                            {a.submissions.filter((s) => s.grade === null).length} to grade
                                        </Badge>
                                    ) : null}
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 flex items-center justify-between gap-3">
                                {a.description ? <p className="text-xs text-muted-foreground">{a.description}</p> : <span />}
                                <div className="flex items-center gap-3 shrink-0">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Due {new Date(a.dueDate).toLocaleDateString()}</p>
                                    <Link href={`/teacher/assignments/${a.id}`}>
                                        <Button variant="outline" className="font-black text-xs uppercase tracking-wider cursor-pointer">
                                            Grade
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))
            )}
        </div>
    );
}
