"use client";

// app/(portal)/admin/classes/page.tsx — academic structure. Teacher assignment
// is per SECTION: the same subject can have a different teacher for section A
// vs B (e.g. Class 8-A Bangla = Teacher 1, 8-B Bangla = Teacher 2).

import * as React from "react";
import { motion } from "motion/react";
import { FaLayerGroup, FaPlus, FaSpinner } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
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

interface ClassSubject {
    id: string;
    subject: { id: string; name: string };
    section: { id: string; name: string };
    teacher: { user: { fullName: string } } | null;
}
interface SchoolClass {
    id: string;
    name: string;
    _count: { students: number };
    sections: { id: string; name: string; _count?: { students: number } }[];
    subjects: ClassSubject[];
}
interface Teacher { id: string; user: { fullName: string } }
interface SubjectOption { id: string; name: string; code: string }

export default function AdminClassesPage() {
    const [classes, setClasses] = React.useState<SchoolClass[]>([]);
    const [teachers, setTeachers] = React.useState<Teacher[]>([]);
    const [subjects, setSubjects] = React.useState<SubjectOption[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [feedback, setFeedback] = React.useState<{ kind: "ok" | "err"; msg: string } | null>(null);
    const [busy, setBusy] = React.useState(false);

    // "class" | "subject" | { kind: "section"|"attach", classId, sectionId? }
    const [dialog, setDialog] = React.useState<"class" | "subject" | { kind: "section" | "attach"; classId: string; sectionId?: string } | null>(null);
    const [className, setClassName] = React.useState("");
    const [sectionName, setSectionName] = React.useState("");
    const [subjectName, setSubjectName] = React.useState("");
    const [subjectCode, setSubjectCode] = React.useState("");
    const [attachSubjectId, setAttachSubjectId] = React.useState("");

    const load = React.useCallback(() => {
        api<{ classes: SchoolClass[]; schoolSubjects: SubjectOption[] }>("/classes")
            .then((p) => {
                setClasses(p.classes);
                setSubjects(p.schoolSubjects ?? []);
            })
            .catch(() => setClasses([]))
            .finally(() => setLoading(false));
    }, []);

    React.useEffect(() => {
        load();
        api<{ data: Teacher[] }>("/teachers")
            .then((p) => setTeachers(p.data))
            .catch(() => setTeachers(() => []));
    }, [load]);

    async function assign(classSubjectId: string, teacherId: string) {
        setFeedback(null);
        try {
            await api(`/classes/assign/${classSubjectId}`, { method: "POST", body: { teacherId } });
            setFeedback({ kind: "ok", msg: "Teacher assigned" });
            load();
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Assign failed" });
        }
    }

    async function submitDialog() {
        setBusy(true); setFeedback(null);
        try {
            if (dialog === "class") {
                await api("/classes", { method: "POST", body: { name: className } });
                setFeedback({ kind: "ok", msg: `Class "${className}" created` });
                setClassName("");
            } else if (dialog === "subject") {
                await api("/classes/subjects", { method: "POST", body: { name: subjectName, code: subjectCode.toUpperCase() } });
                setFeedback({ kind: "ok", msg: `Subject "${subjectName}" created` });
                setSubjectName(""); setSubjectCode("");
            } else if (dialog && typeof dialog === "object" && dialog.kind === "section") {
                await api(`/classes/${dialog.classId}/sections`, { method: "POST", body: { name: sectionName } });
                setFeedback({ kind: "ok", msg: `Section "${sectionName}" added` });
                setSectionName("");
            } else if (dialog && typeof dialog === "object" && dialog.kind === "attach") {
                if (!dialog.sectionId) throw new Error("Select a section");
                await api(`/classes/${dialog.classId}/sections/${dialog.sectionId}/subjects/${attachSubjectId}`, { method: "POST" });
                setFeedback({ kind: "ok", msg: "Subject attached to section" });
                setAttachSubjectId("");
            }
            setDialog(null);
            load();
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : (err instanceof Error ? err.message : "Action failed") });
        } finally { setBusy(false); }
    }

    if (loading) return <div className="space-y-6"><PageHeader title="Classes" icon={FaLayerGroup} /><Skeleton className="h-32" /></div>;

    return (
        <div className="space-y-6">
            <PageHeader title="Classes & Subjects" subtitle="Teachers are assigned per section — the same subject can have different teachers for each section." icon={FaLayerGroup}
                actions={
                    <>
                        <Button onClick={() => setDialog("subject")} className="font-black text-xs uppercase tracking-wider">
                            <FaPlus size={12} /> New Subject
                        </Button>
                        <Button onClick={() => setDialog("class")} className="font-black text-xs uppercase tracking-wider">
                            <FaPlus size={12} /> New Class
                        </Button>
                    </>
                } />

            {feedback ? (
                <div className={`p-4 text-xs font-bold text-center uppercase tracking-wide rounded-xl shadow-sm border ${feedback.kind === "ok" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                    {feedback.msg}
                </div>
            ) : null}

            {classes.length === 0 ? (
                <EmptyState title="No classes" description="Create a class to get started." />
            ) : (
                classes.map((cls) => {
                    // Group the class's ClassSubject rows by section.
                    const bySection = new Map<string, ClassSubject[]>();
                    for (const cs of cls.subjects) {
                        const key = cs.section?.name ?? "—";
                        if (!bySection.has(key)) bySection.set(key, []);
                        bySection.get(key)!.push(cs);
                    }
                    const sectionNames = [...bySection.keys()].sort();

                    return (
                        <motion.div key={cls.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                            <Card className="border-border/60 shadow-sm">
                                <CardHeader className="border-b border-border/60 pb-4 flex flex-row items-center justify-between">
                                    <CardTitle className="text-lg font-black uppercase tracking-tight">{cls.name}</CardTitle>
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-primary/10 text-primary border-primary/20">{cls._count.students} students</Badge>
                                        <Badge variant="outline">{cls.sections.length} sections</Badge>
                                        <Button size="sm" variant="outline" onClick={() => { setSectionName(""); setDialog({ kind: "section", classId: cls.id }); }}
                                            className="font-black text-[10px] uppercase tracking-wider">
                                            <FaPlus size={10} /> Section
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 space-y-5">
                                    <div>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">Sections</p>
                                        <div className="flex flex-wrap gap-2">
                                            {cls.sections.map((s) => (
                                                <Badge key={s.id} variant="outline">{s.name}</Badge>
                                            ))}
                                        </div>
                                    </div>

                                    {sectionNames.map((secName) => (
                                        <div key={secName}>
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-[10px] font-black text-primary uppercase tracking-wider">
                                                    Section {secName} — Subjects & Teachers
                                                </p>
                                                <Button size="sm" variant="outline"
                                                    onClick={() => { setAttachSubjectId(""); const sec = cls.sections.find((s) => s.name === secName); setDialog({ kind: "attach", classId: cls.id, sectionId: sec?.id }); }}
                                                    className="font-black text-[10px] uppercase tracking-wider">
                                                    <FaPlus size={10} /> Subject
                                                </Button>
                                            </div>
                                            <div className="space-y-2">
                                                {bySection.get(secName)!.map((cs) => (
                                                    <div key={cs.id} className="flex items-center justify-between gap-3 p-2 rounded-lg border border-border/60">
                                                        <span className="text-sm font-semibold">{cs.subject.name}</span>
                                                        <Select value={cs.teacher ? cs.teacher.user.fullName : undefined}
                                                            onValueChange={(v) => { const t = teachers.find((x) => x.user.fullName === v); if (t) assign(cs.id, t.id); }}>
                                                            <SelectTrigger className="w-56 h-9 text-xs"><SelectValue placeholder="Assign teacher" /></SelectTrigger>
                                                            <SelectContent>
                                                                {teachers.map((t) => (
                                                                    <SelectItem key={t.id} value={t.user.fullName}>{t.user.fullName}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })
            )}

            <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase tracking-tight">
                            {dialog === "class" ? "New Class" : dialog === "subject" ? "New Subject" : dialog?.kind === "section" ? "Add Section" : "Attach Subject to Section"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {dialog === "class" && (
                            <Input placeholder="Class name (e.g. Class 11)" value={className} onChange={(e) => setClassName(e.target.value)} className="h-11" />
                        )}
                        {dialog === "subject" && (
                            <>
                                <Input placeholder="Subject name (e.g. Higher Math)" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} className="h-11" />
                                <Input placeholder="Code (e.g. HMath)" value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} className="h-11" />
                            </>
                        )}
                        {dialog && typeof dialog === "object" && dialog.kind === "section" && (
                            <Input placeholder="Section name (e.g. A)" value={sectionName} onChange={(e) => setSectionName(e.target.value)} className="h-11" />
                        )}
                        {dialog && typeof dialog === "object" && dialog.kind === "attach" && (
                            <>
                                <Select value={dialog.sectionId || undefined} onValueChange={(v) => setDialog({ ...(dialog as { kind: "attach"; classId: string; sectionId?: string }), sectionId: v })}>
                                    <SelectTrigger className="h-11"><SelectValue placeholder="Choose a section" /></SelectTrigger>
                                    <SelectContent>
                                        {classes.find((c) => c.id === dialog.classId)?.sections.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={attachSubjectId || undefined} onValueChange={setAttachSubjectId}>
                                    <SelectTrigger className="h-11"><SelectValue placeholder="Choose a subject" /></SelectTrigger>
                                    <SelectContent>
                                        {subjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </>
                        )}
                        <Button onClick={submitDialog} disabled={busy}
                            className="w-full h-11 font-black text-xs uppercase tracking-wider">
                            {busy ? <><FaSpinner className="animate-spin" size={12} /> Saving…</> : "Save"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
