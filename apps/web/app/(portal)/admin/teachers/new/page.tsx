"use client";

// app/(portal)/admin/teachers/new/page.tsx — full-page Add Teacher form
// (replaces the cramped modal).

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaChalkboardUser, FaSpinner, FaArrowLeft } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { api, RequestError } from "@/lib/api";

export default function NewTeacherPage() {
    const router = useRouter();
    const [form, setForm] = React.useState({ fullName: "", email: "", password: "password123", phone: "", designation: "", qualification: "", department: "", nid: "", bloodGroup: "" });
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
    const valid = form.fullName.trim().length >= 2 && /\S+@\S+\.\S+/.test(form.email) && form.password.length >= 8;

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true); setError(null);
        try {
            await api("/teachers", {
                method: "POST",
                body: {
                    fullName: form.fullName, email: form.email, password: form.password, phone: form.phone || undefined,
                    designation: form.designation || undefined, qualification: form.qualification || undefined,
                    department: form.department || undefined, nid: form.nid || undefined, bloodGroup: form.bloodGroup || undefined,
                },
            });
            router.push("/admin/teachers");
        } catch (err) {
            setError(err instanceof RequestError ? err.messages.join("; ") : "Could not create teacher");
            setBusy(false);
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Add Teacher" subtitle="Create a new staff account" icon={FaChalkboardUser}
                actions={
                    <Link href="/admin/teachers">
                        <Button variant="outline" className="font-black text-xs uppercase tracking-wider cursor-pointer">
                            <FaArrowLeft size={12} /> Back to teachers
                        </Button>
                    </Link>
                } />

            <Card className="border-border/60 shadow-sm max-w-2xl">
                <CardHeader className="border-b border-border/60 pb-4">
                    <CardTitle className="text-lg font-black uppercase tracking-tight">Teacher Details</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <form onSubmit={submit} className="space-y-5">
                        {error ? (
                            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">{error}</div>
                        ) : null}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Field label="Full name" required>
                                <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} className="h-11" placeholder="e.g. Karim Hossain" />
                            </Field>
                            <Field label="Email (login)" required>
                                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="h-11" placeholder="name@guziahs.edu" />
                            </Field>
                            <Field label="Temp password" required>
                                <Input value={form.password} onChange={(e) => set("password", e.target.value)} className="h-11" placeholder="min 8 characters" />
                            </Field>
                            <Field label="Phone (optional)">
                                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="h-11" placeholder="01XXXXXXXXX" />
                            </Field>
                        </div>

                        <div>
                            <p className="text-[10px] font-black text-primary uppercase tracking-wider mb-3">Profile (optional)</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Designation">
                                    <Input value={form.designation} onChange={(e) => set("designation", e.target.value)} className="h-11" placeholder="e.g. Assistant Teacher" />
                                </Field>
                                <Field label="Department / Subject">
                                    <Input value={form.department} onChange={(e) => set("department", e.target.value)} className="h-11" placeholder="e.g. Science" />
                                </Field>
                                <Field label="Qualification">
                                    <Input value={form.qualification} onChange={(e) => set("qualification", e.target.value)} className="h-11" placeholder="e.g. M.Sc, B.Ed" />
                                </Field>
                                <Field label="NID">
                                    <Input value={form.nid} onChange={(e) => set("nid", e.target.value)} className="h-11" />
                                </Field>
                                <Field label="Blood group">
                                    <Select value={form.bloodGroup || undefined} onValueChange={(v) => set("bloodGroup", v)} label="Blood group">
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent searchable>
                                            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </Field>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button type="submit" disabled={busy || !valid} className="font-black text-xs uppercase tracking-wider">
                                {busy ? <><FaSpinner className="animate-spin" size={12} /> Creating…</> : <><FaChalkboardUser size={12} /> Create Teacher</>}
                            </Button>
                            <Link href="/admin/teachers">
                                <Button type="button" variant="outline" className="font-black text-xs uppercase tracking-wider cursor-pointer">Cancel</Button>
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

/**
 * A labelled form field. The label is wired to the input with a generated
 * id, so clicking the label focuses the input.
 *
 * This lives at module scope on purpose: defined inside the page component,
 * every render produced a new component identity, so React unmounted and
 * remounted the whole form on every keystroke and typing lost focus after
 * each character.
 */
function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
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
}
