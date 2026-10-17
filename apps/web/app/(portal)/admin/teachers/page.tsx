"use client";

// app/(portal)/admin/teachers/page.tsx — teacher directory: list + create.

import * as React from "react";
import { motion } from "motion/react";
import { FaChalkboardUser, FaPlus, FaSpinner, FaPen, FaBan } from "react-icons/fa6";
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
import { PageHeader } from "@/components/shared/page-header";
import { api, RequestError } from "@/lib/api";

interface Teacher {
    id: string; employeeId: string; phone: string | null;
    user: { fullName: string; email: string; status: string };
    subjects: { subject: { name: string }; class: { name: string } }[];
}

export default function AdminTeachersPage() {
    const [teachers, setTeachers] = React.useState<Teacher[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [open, setOpen] = React.useState(false);
    const [form, setForm] = React.useState({ fullName: "", email: "", password: "password123", phone: "" });
    const [busy, setBusy] = React.useState(false);
    const [feedback, setFeedback] = React.useState<{ kind: "ok" | "err"; msg: string } | null>(null);
    const [editTeacher, setEditTeacher] = React.useState<Teacher | null>(null);
    const [editForm, setEditForm] = React.useState({ fullName: "", phone: "" });
    const [busyId, setBusyId] = React.useState<string | null>(null);

    const load = React.useCallback(() => {
        api<{ data: Teacher[] }>("/teachers")
            .then((p) => setTeachers(p.data))
            .catch(() => setTeachers([]))
            .finally(() => setLoading(false));
    }, []);

    React.useEffect(() => { load(); }, [load]);

    async function create() {
        setBusy(true); setFeedback(null);
        try {
            await api("/teachers", { method: "POST", body: { fullName: form.fullName, email: form.email, password: form.password, phone: form.phone || undefined } });
            setFeedback({ kind: "ok", msg: "Teacher created" });
            setOpen(false);
            setForm({ fullName: "", email: "", password: "password123", phone: "" });
            load();
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Create failed" });
        } finally { setBusy(false); }
    }

    function openEdit(t: Teacher) {
        setEditTeacher(t);
        setEditForm({ fullName: t.user.fullName, phone: t.phone ?? "" });
    }

    async function saveEdit() {
        if (!editTeacher) return;
        setBusyId(editTeacher.id); setFeedback(null);
        try {
            await api(`/teachers/${editTeacher.id}`, {
                method: "PATCH",
                body: { fullName: editForm.fullName, phone: editForm.phone || undefined },
            });
            setFeedback({ kind: "ok", msg: "Teacher updated" });
            setEditTeacher(null);
            load();
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Update failed" });
        } finally { setBusyId(null); }
    }

    async function block(t: Teacher) {
        if (!confirm(`Block ${t.user.fullName}? Their login will be disabled.`)) return;
        setBusyId(t.id); setFeedback(null);
        try {
            await api(`/teachers/${t.id}`, { method: "DELETE" });
            setFeedback({ kind: "ok", msg: `${t.user.fullName} blocked` });
            load();
        } catch (err) {
            setFeedback({ kind: "err", msg: err instanceof RequestError ? err.messages.join("; ") : "Block failed" });
        } finally { setBusyId(null); }
    }

    if (loading) return <div className="space-y-6"><PageHeader title="Teachers" icon={FaChalkboardUser} /><Skeleton className="h-32" /></div>;

    return (
        <div className="space-y-6">
            <PageHeader title="Teachers" subtitle={`${teachers.length} staff`} icon={FaChalkboardUser}
                actions={
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button className="font-black text-xs uppercase tracking-wider"><FaPlus size={12} /> Add Teacher</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader><DialogTitle className="font-black uppercase tracking-tight">Add Teacher</DialogTitle></DialogHeader>
                            <div className="space-y-4">
                                <Input placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="h-11" />
                                <Input type="email" placeholder="Email (login)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-11" />
                                <Input placeholder="Temp password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-11" />
                                <Input placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-11" />
                                <Button onClick={create} disabled={busy || !form.fullName || !form.email} className="w-full h-11 font-black text-xs uppercase tracking-wider">
                                    {busy ? <><FaSpinner className="animate-spin" size={12} /> Creating…</> : "Create Teacher"}
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

            {teachers.length === 0 ? (
                <EmptyState title="No teachers" description="Add a teacher to get started." />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teachers.map((t, i) => (
                        <motion.div key={t.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}>
                            <Card className="border-border/60 shadow-sm h-full">
                                <CardContent className="p-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black shrink-0">
                                            {t.user.fullName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold truncate">{t.user.fullName}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t.employeeId}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                        {t.subjects.length === 0 ? (
                                            <Badge variant="outline" className="text-[9px] text-muted-foreground">No subjects assigned</Badge>
                                        ) : (
                                            t.subjects.map((s, si) => (
                                                <Badge key={si} className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px]">
                                                    {s.subject.name} · {s.class.name}
                                                </Badge>
                                            ))
                                        )}
                                    </div>
                                    <div className="flex gap-2 mt-4 pt-3 border-t border-border/60">
                                        <Button size="sm" variant="outline" onClick={() => openEdit(t)} disabled={busyId === t.id}
                                            className="flex-1 font-black text-[10px] uppercase tracking-wider">
                                            <FaPen size={10} /> Edit
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => block(t)} disabled={busyId === t.id}
                                            className="text-destructive border-destructive/20 hover:bg-destructive/10 font-black text-[10px] uppercase tracking-wider">
                                            {busyId === t.id ? <FaSpinner className="animate-spin" size={10} /> : <FaBan size={10} />} Block
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}

            <Dialog open={!!editTeacher} onOpenChange={(o) => !o && setEditTeacher(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle className="font-black uppercase tracking-tight">Edit Teacher</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Full name</label>
                            <Input value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} className="h-11" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Phone</label>
                            <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="h-11" placeholder="Optional" />
                        </div>
                        <Button onClick={saveEdit} disabled={busyId === editTeacher?.id || !editForm.fullName} className="w-full h-11 font-black text-xs uppercase tracking-wider">
                            {busyId === editTeacher?.id ? <><FaSpinner className="animate-spin" size={12} /> Saving…</> : "Save Changes"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
