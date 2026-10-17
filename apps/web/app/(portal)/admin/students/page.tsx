"use client";

// app/(portal)/admin/students/page.tsx — student directory: search, filter,
// create, view detail (with stats).

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { FaUsers, FaPlus, FaMagnifyingGlass, FaSpinner, FaPen, FaBan } from "react-icons/fa6";
import { Card, CardContent } from "@/components/ui/card";
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

interface Student {
    id: string; admissionNo: string; fullName: string; rollNo: number;
    class: { name: string }; section: { name: string } | null;
    user: { email: string; status: string } | null;
}
interface ClassOption { id: string; name: string; sections: { id: string; name: string }[] }

export default function AdminStudentsPage() {
    const [students, setStudents] = React.useState<Student[]>([]);
    const [classes, setClasses] = React.useState<ClassOption[]>([]);
    const [search, setSearch] = React.useState("");
    const [loading, setLoading] = React.useState(true);
    const [loadingList, setLoadingList] = React.useState(false);

    const [open, setOpen] = React.useState(false);
    const [form, setForm] = React.useState({ fullName: "", email: "", password: "password123", classId: "", sectionId: "", rollNo: "1" });
    const [busy, setBusy] = React.useState(false);
    const [feedback, setFeedback] = React.useState<{ kind: "ok" | "err"; msg: string } | null>(null);
    const router = useRouter();
    const [editStudent, setEditStudent] = React.useState<Student | null>(null);
    const [editForm, setEditForm] = React.useState({ fullName: "", rollNo: "1", classId: "", sectionId: "" });
    const [busyId, setBusyId] = React.useState<string | null>(null);

    const load = React.useCallback((q: string) => {
        setLoadingList(true);
        api<{ data: Student[] }>(`/students${q ? `?search=${encodeURIComponent(q)}` : ""}`)
            .then((p) => setStudents(p.data))
            .catch(() => setStudents([]))
            .finally(() => setLoadingList(false));
    }, []);

    React.useEffect(() => {
        load("");
        api<{ classes: ClassOption[] }>("/classes")
            .then((p) => setClasses(p.classes))
            .catch(() => setClasses([]))
            .finally(() => setLoading(false));
    }, [load]);

    React.useEffect(() => {
        const t = setTimeout(() => load(search), 300);
        return () => clearTimeout(t);
    }, [search, load]);

    async function create() {
        setBusy(true);
        setFeedback(null);
        try {
            await api("/students", {
                method: "POST",
                body: {
                    fullName: form.fullName,
                    email: form.email,
                    password: form.password,
                    classId: form.classId,
                    sectionId: form.sectionId || undefined,
                    rollNo: Number(form.rollNo),
                },
            });
            setFeedback({ kind: "ok", msg: "Student created" });
            setOpen(false);
            setForm({ fullName: "", email: "", password: "password123", classId: "", sectionId: "", rollNo: "1" });
            load(search);
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Create failed" });
        } finally {
            setBusy(false);
        }
    }

    function openEdit(s: Student) {
        setEditStudent(s);
        setEditForm({ fullName: s.fullName, rollNo: String(s.rollNo), classId: "", sectionId: "" });
    }

    async function saveEdit() {
        if (!editStudent) return;
        setBusyId(editStudent.id); setFeedback(null);
        try {
            await api(`/students/${editStudent.id}`, {
                method: "PATCH",
                body: { fullName: editForm.fullName, rollNo: Number(editForm.rollNo) },
            });
            setFeedback({ kind: "ok", msg: "Student updated" });
            setEditStudent(null);
            load(search);
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Update failed" });
        } finally { setBusyId(null); }
    }

    async function block(s: Student) {
        if (!confirm(`Block ${s.fullName}? Their login will be disabled.`)) return;
        setBusyId(s.id); setFeedback(null);
        try {
            await api(`/students/${s.id}`, { method: "DELETE" });
            setFeedback({ kind: "ok", msg: `${s.fullName} blocked` });
            load(search);
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Block failed" });
        } finally { setBusyId(null); }
    }

    if (loading) return <div className="space-y-6"><PageHeader title="Students" icon={FaUsers} /><Skeleton className="h-32" /></div>;

    return (
        <div className="space-y-6">
            <PageHeader title="Students" subtitle={`${students.length} enrolled`} icon={FaUsers}
                actions={
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button className="font-black text-xs uppercase tracking-wider"><FaPlus size={12} /> Add Student</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader><DialogTitle className="font-black uppercase tracking-tight">Add Student</DialogTitle></DialogHeader>
                            <div className="space-y-4">
                                <Input placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="h-11" />
                                <Input type="email" placeholder="Email (login)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-11" />
                                <Input placeholder="Temp password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-11" />
                                <div className="grid grid-cols-3 gap-3">
                                    <Select value={form.classId || undefined} onValueChange={(v) => setForm({ ...form, classId: v, sectionId: "" })}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Class" /></SelectTrigger>
                                        <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Select value={form.sectionId || undefined} onValueChange={(v) => setForm({ ...form, sectionId: v })}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Section" /></SelectTrigger>
                                        <SelectContent>{classes.find((c) => c.id === form.classId)?.sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Input type="number" min={1} placeholder="Roll" value={form.rollNo} onChange={(e) => setForm({ ...form, rollNo: e.target.value })} className="h-11" />
                                </div>
                                <Button onClick={create} disabled={busy || !form.fullName || !form.email || !form.classId} className="w-full h-11 font-black text-xs uppercase tracking-wider">
                                    {busy ? <><FaSpinner className="animate-spin" size={12} /> Creating…</> : "Create Student"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                } />

            <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground"><FaMagnifyingGlass size={12} /></div>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or admission no…" className="pl-9 h-11" />
            </div>

            {feedback ? (
                <div className={`p-4 text-xs font-bold text-center uppercase tracking-wide rounded-xl shadow-sm border ${feedback.kind === "ok" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                    {feedback.msg}
                </div>
            ) : null}

            {loadingList ? (
                <Skeleton className="h-64" />
            ) : students.length === 0 ? (
                <EmptyState title="No students" description="Add a student or adjust your search." />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {students.map((s, i) => (
                        <motion.div key={s.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}>
                            <Card className="border-border/60 shadow-sm hover:border-primary/20 transition-all h-full">
                                <CardContent className="p-5">
                                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push(`/admin/students/${s.id}`)}>
                                        <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black shrink-0">
                                            {s.fullName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold truncate">{s.fullName}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.admissionNo}</p>
                                            <div className="flex gap-1.5 mt-1">
                                                <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px]">{s.class.name}</Badge>
                                                {s.section ? <Badge variant="outline" className="text-[9px]">{s.section.name}</Badge> : null}
                                                {s.user?.status === "BLOCKED" ? <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[9px]">Blocked</Badge> : null}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-4 pt-3 border-t border-border/60">
                                        <Button size="sm" variant="outline" onClick={() => openEdit(s)} disabled={busyId === s.id}
                                            className="flex-1 font-black text-[10px] uppercase tracking-wider">
                                            <FaPen size={10} /> Edit
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => block(s)} disabled={busyId === s.id}
                                            className="text-destructive border-destructive/20 hover:bg-destructive/10 font-black text-[10px] uppercase tracking-wider">
                                            {busyId === s.id ? <FaSpinner className="animate-spin" size={10} /> : <FaBan size={10} />} Block
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}

            <Dialog open={!!editStudent} onOpenChange={(o) => !o && setEditStudent(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle className="font-black uppercase tracking-tight">Edit Student</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Full name</label>
                            <Input value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} className="h-11" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Roll number</label>
                            <Input type="number" min={1} value={editForm.rollNo} onChange={(e) => setEditForm({ ...editForm, rollNo: e.target.value })} className="h-11" />
                        </div>
                        <Button onClick={saveEdit} disabled={busyId === editStudent?.id || !editForm.fullName} className="w-full h-11 font-black text-xs uppercase tracking-wider">
                            {busyId === editStudent?.id ? <><FaSpinner className="animate-spin" size={12} /> Saving…</> : "Save Changes"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
