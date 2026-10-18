"use client";

// app/(portal)/admin/students/new/page.tsx — full-page Add Student form
// (replaces the cramped modal). Spacious grid + inline validation.

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaUserPlus, FaSpinner, FaArrowLeft } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { api, RequestError } from "@/lib/api";

interface ClassOption { id: string; name: string; sections: { id: string; name: string }[] }

const GENDERS = ["male", "female", "other"];

export default function NewStudentPage() {
    const router = useRouter();
    const [classes, setClasses] = React.useState<ClassOption[]>([]);
    const [loadingClasses, setLoadingClasses] = React.useState(true);
    const [form, setForm] = React.useState({
        fullName: "", email: "", password: "password123", classId: "", sectionId: "",
        rollNo: "1", dateOfBirth: "", gender: "", bloodGroup: "", religion: "",
        guardianName: "", guardianPhone: "", village: "", district: "", previousSchool: "",
    });
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        api<{ classes: ClassOption[] }>("/classes")
            .then((p) => setClasses(p.classes))
            .catch(() => setClasses([]))
            .finally(() => setLoadingClasses(false));
    }, []);

    const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
    const valid = form.fullName.trim().length >= 2 && /\S+@\S+\.\S+/.test(form.email) &&
        form.password.length >= 8 && form.classId && Number(form.rollNo) >= 1;

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true); setError(null);
        try {
            await api("/students", {
                method: "POST",
                body: {
                    fullName: form.fullName, email: form.email, password: form.password,
                    classId: form.classId, sectionId: form.sectionId || undefined,
                    rollNo: Number(form.rollNo),
                    dateOfBirth: form.dateOfBirth || undefined,
                    gender: form.gender || undefined,
                    bloodGroup: form.bloodGroup || undefined,
                    religion: form.religion || undefined,
                    guardianName: form.guardianName || undefined,
                    guardianPhone: form.guardianPhone || undefined,
                    village: form.village || undefined,
                    district: form.district || undefined,
                    previousSchool: form.previousSchool || undefined,
                },
            });
            router.push("/admin/students");
        } catch (err) {
            setError(err instanceof RequestError ? err.messages.join("; ") : "Could not create student");
            setBusy(false);
        }
    }

    const Field = ({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) => {
        const id = React.useId();
        const child = React.isValidElement(children)
            ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, { id, required: required || undefined })
            : children;
        return (
            <div className="space-y-1.5">
                <Label htmlFor={id} className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                    {label} {required ? <span className="text-primary">*</span> : null}
                </Label>
                {child}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Add Student" subtitle="Create a new enrolled student + portal login" icon={FaUserPlus}
                actions={
                    <Link href="/admin/students">
                        <Button variant="outline" className="font-black text-xs uppercase tracking-wider cursor-pointer">
                            <FaArrowLeft size={12} /> Back to students
                        </Button>
                    </Link>
                } />

            <Card className="border-border/60 shadow-sm max-w-3xl">
                <CardHeader className="border-b border-border/60 pb-4">
                    <CardTitle className="text-lg font-black uppercase tracking-tight">Student Details</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <form onSubmit={submit} className="space-y-5">
                        {error ? (
                            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                                {error}
                            </div>
                        ) : null}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Full name" required>
                                <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} className="h-11" placeholder="e.g. Ayaan Rahman" />
                            </Field>
                            <Field label="Email (login)" required>
                                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="h-11" placeholder="name@guziahs.edu" />
                            </Field>
                            <Field label="Temp password" required>
                                <Input value={form.password} onChange={(e) => set("password", e.target.value)} className="h-11" placeholder="min 8 characters" />
                            </Field>
                            <Field label="Roll number" required>
                                <Input type="number" min={1} value={form.rollNo} onChange={(e) => set("rollNo", e.target.value)} className="h-11" />
                            </Field>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Field label="Class" required>
                                <Select value={form.classId || undefined} onValueChange={(v) => setForm((f) => ({ ...f, classId: v, sectionId: "" }))}>
                                    <SelectTrigger className="h-11"><SelectValue placeholder={loadingClasses ? "Loading…" : "Select class"} /></SelectTrigger>
                                    <SelectContent searchable>
                                        {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Section">
                                <Select value={form.sectionId || undefined} onValueChange={(v) => set("sectionId", v)}>
                                    <SelectTrigger className="h-11"><SelectValue placeholder="Select section" /></SelectTrigger>
                                    <SelectContent>
                                        {classes.find((c) => c.id === form.classId)?.sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Gender">
                                <Select value={form.gender || undefined} onValueChange={(v) => set("gender", v)}>
                                    <SelectTrigger className="h-11"><SelectValue placeholder="Select gender" /></SelectTrigger>
                                    <SelectContent>
                                        {GENDERS.map((g) => <SelectItem key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>

                        <Field label="Date of birth">
                            <Input type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} className="h-11" />
                        </Field>

                        <div>
                            <p className="text-[10px] font-black text-primary uppercase tracking-wider mb-3">Profile & Guardian (optional)</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Field label="Blood group">
                                    <Select value={form.bloodGroup || undefined} onValueChange={(v) => set("bloodGroup", v)} label="Blood group">
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent searchable>
                                            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field label="Religion">
                                    <Select value={form.religion || undefined} onValueChange={(v) => set("religion", v)} label="Religion">
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent searchable>
                                            {["islam", "hinduism", "christianity", "buddhism", "other"].map((r) => <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field label="Previous school">
                                    <Input value={form.previousSchool} onChange={(e) => set("previousSchool", e.target.value)} className="h-11" />
                                </Field>
                                <Field label="Guardian name">
                                    <Input value={form.guardianName} onChange={(e) => set("guardianName", e.target.value)} className="h-11" />
                                </Field>
                                <Field label="Guardian phone">
                                    <Input value={form.guardianPhone} onChange={(e) => set("guardianPhone", e.target.value)} className="h-11" placeholder="017XXXXXXXX" />
                                </Field>
                                <Field label="Village / Area">
                                    <Input value={form.village} onChange={(e) => set("village", e.target.value)} className="h-11" />
                                </Field>
                                <Field label="District">
                                    <Input value={form.district} onChange={(e) => set("district", e.target.value)} className="h-11" />
                                </Field>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button type="submit" disabled={busy || !valid} className="font-black text-xs uppercase tracking-wider">
                                {busy ? <><FaSpinner className="animate-spin" size={12} /> Creating…</> : <><FaUserPlus size={12} /> Create Student</>}
                            </Button>
                            <Link href="/admin/students">
                                <Button type="button" variant="outline" className="font-black text-xs uppercase tracking-wider cursor-pointer">Cancel</Button>
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
