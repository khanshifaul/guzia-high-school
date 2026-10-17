"use client";

// app/admission/page.tsx — public online admission form (no login), single
// step: student + guardian info, academic choice, and attachments (photo,
// birth certificate, testimonial). Submit → printable application form +
// portal credentials (also emailed via Resend when configured).

import * as React from "react";
import { motion } from "motion/react";
import { FaGraduationCap, FaPrint, FaCircleCheck, FaSpinner, FaUpload, FaImage, FaFileLines, FaAward } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";
import { useLanguage } from "@/lib/language-context";
import { useSiteConfig } from "@/lib/site-config";
import { api, RequestError } from "@/lib/api";

const CLASSES = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"];
const RELATIONS = ["father", "mother", "guardian"];

interface FormState {
    studentName: string; dateOfBirth: string; gender: string; birthCertNo: string; previousSchool: string;
    guardianName: string; guardianRelation: string; phone: string; email: string; address: string;
    classWanted: string; note: string;
}
interface Files { photoUrl?: string; birthCertUrl?: string; testimonialUrl?: string }
interface Receipt extends Files {
    id: string; username: string; password: string; studentName: string; classWanted: string; emailSent: boolean;
}

const EMPTY: FormState = {
    studentName: "", dateOfBirth: "", gender: "", birthCertNo: "", previousSchool: "",
    guardianName: "", guardianRelation: "father", phone: "", email: "", address: "",
    classWanted: "", note: "",
};

const UPLOAD_META: Record<keyof Files, { label: string; icon: typeof FaImage; accept: string }> = {
    photoUrl: { label: "Student Photo", icon: FaImage, accept: "image/*" },
    birthCertUrl: { label: "Birth Certificate", icon: FaFileLines, accept: "image/*,application/pdf" },
    testimonialUrl: { label: "Testimonial / Transfer Certificate", icon: FaAward, accept: "image/*,application/pdf" },
};

export default function AdmissionPage() {
    const { t } = useLanguage();
    const cfg = useSiteConfig();
    const [form, setForm] = React.useState<FormState>(EMPTY);
    const [files, setFiles] = React.useState<Files>({});
    const [uploading, setUploading] = React.useState<keyof Files | null>(null);
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [receipt, setReceipt] = React.useState<Receipt | null>(null);

    const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));
    const tn = (en: string, bn: string) => t(en, bn);

    async function uploadFile(kind: keyof Files, file: File) {
        setUploading(kind);
        setError(null);
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("folder", "admissions");
            const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message?.[0] ?? "Upload failed");
            setFiles((f) => ({ ...f, [kind]: data.url }));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setUploading(null);
        }
    }

    const valid =
        form.studentName.trim().length >= 2 && form.classWanted !== "" &&
        form.guardianName.trim().length >= 2 && /^\d{6,15}$/.test(form.phone.trim()) &&
        /\S+@\S+\.\S+/.test(form.email);

    async function submit() {
        setBusy(true);
        setError(null);
        try {
            const res = await api<Receipt>("/admissions", {
                method: "POST",
                body: {
                    studentName: form.studentName.trim(),
                    guardianName: form.guardianName.trim(),
                    phone: form.phone.trim(),
                    email: form.email.trim(),
                    classWanted: form.classWanted,
                    ...(form.dateOfBirth ? { dateOfBirth: form.dateOfBirth } : {}),
                    ...(form.gender ? { gender: form.gender } : {}),
                    ...(form.birthCertNo.trim() ? { birthCertNo: form.birthCertNo.trim() } : {}),
                    ...(form.previousSchool.trim() ? { previousSchool: form.previousSchool.trim() } : {}),
                    ...(form.guardianRelation ? { guardianRelation: form.guardianRelation } : {}),
                    ...(form.address.trim() ? { address: form.address.trim() } : {}),
                    ...(form.note.trim() ? { note: form.note.trim() } : {}),
                    ...files,
                },
            });
            setReceipt(res);
        } catch (err) {
            setError(err instanceof RequestError ? err.messages.join("; ") : "Submission failed. Please try again.");
        } finally {
            setBusy(false);
        }
    }

    // ─── PRINTABLE RECEIPT ───
    if (receipt) {
        const rows: [string, string][] = [
            [tn("Application No.", "আবেদন নং"), receipt.id.slice(-8).toUpperCase()],
            [tn("Student Name", "শিক্ষার্থীর নাম"), receipt.studentName],
            [tn("Date of Birth", "জন্মতারিখ"), form.dateOfBirth || "—"],
            [tn("Gender", "লিঙ্গ"), form.gender || "—"],
            [tn("Birth Cert. No.", "জন্মনিবন্ধন নং"), form.birthCertNo || "—"],
            [tn("Guardian Name", "অভিভাবকের নাম"), form.guardianName],
            [tn("Relation", "সম্পর্ক"), form.guardianRelation || "—"],
            [tn("Phone", "ফোন"), form.phone],
            [tn("Email", "ইমেইল"), form.email],
            [tn("Address", "ঠিকানা"), form.address || "—"],
            [tn("Previous School", "পূর্ববর্তী বিদ্যালয়"), form.previousSchool || "—"],
            [tn("Class Applied for", "যে শ্রেণিতে আবেদন"), receipt.classWanted],
            [tn("Date", "তারিখ"), new Date().toLocaleDateString("en-GB")],
        ];
        return (
            <div className="min-h-screen flex flex-col bg-muted/30">
                <style>{`@media print { .no-print { display: none !important; } body { background: #fff !important; } }`}</style>
                <div className="no-print"><Navbar /></div>
                <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl">
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="no-print mb-6 text-center">
                            <div className="inline-flex items-center gap-2 text-emerald-600 font-black uppercase tracking-wider text-sm">
                                <FaCircleCheck size={18} /> {tn("Application Submitted", "আবেদন জমা হয়েছে")}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                {receipt.emailSent
                                    ? tn("Your credentials have also been emailed to you.", "আপনার পরিচয়পত্র ইমেইলে পাঠানো হয়েছে।")
                                    : tn("Save or print this form — it contains your portal credentials.", "এই ফর্মটি সংরক্ষণ বা প্রিন্ট করুন — এতে আপনার পোর্টাল পরিচয়পত্র রয়েছে।")}
                            </p>
                        </div>
                        <Card className="border-2 border-border bg-card">
                            <CardContent className="p-8">
                                <div className="text-center border-b border-border pb-4 mb-6">
                                    <div className="inline-flex items-center justify-center size-14 rounded-xl bg-primary/10 mb-2">
                                        <FaGraduationCap className="text-primary" size={28} />
                                    </div>
                                    <h1 className="text-2xl font-black text-primary uppercase tracking-tight">{cfg.schoolName}</h1>
                                    <p className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase mt-1">
                                        Admission Application · EIIN: {cfg.eiin} · {cfg.board}
                                    </p>
                                </div>
                                <table className="w-full text-sm border-collapse">
                                    <tbody>
                                        {rows.map(([k, v]) => (
                                            <tr key={k} className="border-b border-border/60">
                                                <td className="py-2.5 pr-4 font-bold text-muted-foreground whitespace-nowrap align-top w-48">{k}</td>
                                                <td className="py-2.5 text-foreground">{v}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {(receipt.photoUrl || receipt.birthCertUrl || receipt.testimonialUrl) ? (
                                    <div className="mt-6">
                                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-3">{tn("Attachments", "সংযুক্তি")}</p>
                                        <div className="flex flex-wrap gap-4">
                                            {receipt.photoUrl ? (
                                                <div className="text-center">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={receipt.photoUrl} alt="Student" className="size-24 object-cover rounded-lg border border-border" />
                                                    <p className="text-[10px] text-muted-foreground mt-1">{tn("Photo", "ছবি")}</p>
                                                </div>
                                            ) : null}
                                            {receipt.birthCertUrl ? (
                                                <a href={receipt.birthCertUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline self-start">{tn("Birth Certificate", "জন্মনিবন্ধন")}</a>
                                            ) : null}
                                            {receipt.testimonialUrl ? (
                                                <a href={receipt.testimonialUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline self-start">{tn("Testimonial", "প্রশংসাপত্র")}</a>
                                            ) : null}
                                        </div>
                                    </div>
                                ) : null}
                                <div className="mt-6 p-4 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-wider mb-3">{tn("Portal Login Credentials", "পোর্টাল লগইন পরিচয়পত্র")}</p>
                                    <table className="w-full text-sm border-collapse">
                                        <tbody>
                                            <tr className="border-b border-border/60"><td className="py-2 pr-4 font-bold text-muted-foreground w-32">{tn("Username", "ব্যবহারকারী নাম")}</td><td className="py-2 font-mono font-bold">{receipt.username}</td></tr>
                                            <tr><td className="py-2 pr-4 font-bold text-muted-foreground">{tn("Password", "পাসওয়ার্ড")}</td><td className="py-2 font-mono font-bold text-primary">{receipt.password}</td></tr>
                                        </tbody>
                                    </table>
                                    <p className="text-[10px] text-muted-foreground mt-3">{tn("Use these to log in and track your application. Change your password after first login.", "অবস্থা ট্র্যাক করতে এগুলো দিয়ে লগইন করুন। প্রথম লগইনের পরে পাসওয়ার্ড পরিবর্তন করুন।")}</p>
                                </div>
                            </CardContent>
                        </Card>
                        <div className="no-print flex flex-col sm:flex-row gap-3 mt-6 justify-center">
                            <Button onClick={() => window.print()} className="gap-2 font-black text-xs uppercase tracking-wider"><FaPrint size={12} /> {tn("Print / Save as PDF", "প্রিন্ট / PDF সংরক্ষণ")}</Button>
                            <Button variant="outline" onClick={() => { setReceipt(null); setForm(EMPTY); setFiles({}); }} className="font-black text-xs uppercase tracking-wider">{tn("New Application", "নতুন আবেদন")}</Button>
                        </div>
                    </motion.div>
                </main>
                <div className="no-print"><Footer /></div>
            </div>
        );
    }

    // ─── SINGLE-STEP FORM ───
    const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
        <div className="space-y-1.5">
            <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{label}</Label>
            {children}
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 bg-muted/30 py-10">
                <div className="container mx-auto px-4 max-w-3xl">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-black text-primary uppercase tracking-tight">{tn("Online Admission", "অনলাইন ভর্তি")}</h1>
                        <p className="text-sm text-muted-foreground mt-2">{tn("Fill out the form below — no account needed. Credentials are issued after you submit.", "নিচের ফর্মটি পূরণ করুন — কোনো অ্যাকাউন্ট লাগবে না। জমা দেওয়ার পরে পরিচয়পত্র দেওয়া হবে।")}</p>
                    </div>

                    <Card className="border-border/60 shadow-md">
                        <div className="h-1.5 bg-gradient-brand w-full rounded-t-xl" />
                        <CardContent className="p-6 md:p-8 space-y-8">
                            {error ? (
                                <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">{error}</div>
                            ) : null}

                            {/* Student info */}
                            <section>
                                <p className="text-[10px] font-black text-primary uppercase tracking-wider mb-4">{tn("1. Student Information", "১. শিক্ষার্থীর তথ্য")}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Field label={`${tn("Student Name", "শিক্ষার্থীর নাম")} *`}><Input className="h-11" value={form.studentName} onChange={(e) => set("studentName", e.target.value)} /></Field>
                                    <Field label={tn("Date of Birth", "জন্মতারিখ")}><Input className="h-11" type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} /></Field>
                                    <Field label={tn("Gender", "লিঙ্গ")}>
                                        <div className="flex gap-2">
                                            {["male", "female"].map((g) => (
                                                <button key={g} type="button" onClick={() => set("gender", g)}
                                                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer ${form.gender === g ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
                                                    {tn(g, g === "male" ? "পুরুষ" : "নারী")}
                                                </button>
                                            ))}
                                        </div>
                                    </Field>
                                    <Field label={tn("Birth Cert. No.", "জন্মনিবন্ধন নং")}><Input className="h-11" value={form.birthCertNo} onChange={(e) => set("birthCertNo", e.target.value)} /></Field>
                                    <Field label={tn("Previous School", "পূর্ববর্তী বিদ্যালয়")}><Input className="h-11" value={form.previousSchool} onChange={(e) => set("previousSchool", e.target.value)} /></Field>
                                    <Field label={`${tn("Class Applied for", "যে শ্রেণিতে আবেদন")} *`}>
                                        <div className="grid grid-cols-5 gap-2">
                                            {CLASSES.map((c) => (
                                                <button key={c} type="button" onClick={() => set("classWanted", c)}
                                                    className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer ${form.classWanted === c ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
                                                    {c.replace("Class ", "")}
                                                </button>
                                            ))}
                                        </div>
                                    </Field>
                                </div>
                            </section>

                            {/* Guardian info */}
                            <section>
                                <p className="text-[10px] font-black text-primary uppercase tracking-wider mb-4">{tn("2. Guardian Information", "২. অভিভাবকের তথ্য")}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Field label={`${tn("Guardian Name", "অভিভাবকের নাম")} *`}><Input className="h-11" value={form.guardianName} onChange={(e) => set("guardianName", e.target.value)} /></Field>
                                    <Field label={tn("Relation", "সম্পর্ক")}>
                                        <div className="flex gap-2">
                                            {RELATIONS.map((r) => (
                                                <button key={r} type="button" onClick={() => set("guardianRelation", r)}
                                                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${form.guardianRelation === r ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
                                                    {tn(r, r === "father" ? "পিতা" : r === "mother" ? "মাতা" : "অভিভাবক")}
                                                </button>
                                            ))}
                                        </div>
                                    </Field>
                                    <Field label={`${tn("Phone", "ফোন")} *`}><Input className="h-11" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="017XXXXXXXX" /></Field>
                                    <Field label={`${tn("Email", "ইমেইল")} *`}><Input className="h-11" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
                                    <div className="md:col-span-2"><Field label={tn("Address", "ঠিকানা")}><Textarea className="rounded-md" rows={2} value={form.address} onChange={(e) => set("address", e.target.value)} /></Field></div>
                                </div>
                            </section>

                            {/* Attachments */}
                            <section>
                                <p className="text-[10px] font-black text-primary uppercase tracking-wider mb-1">{tn("3. Attachments", "৩. সংযুক্তি")}</p>
                                <p className="text-[11px] text-muted-foreground mb-4">{tn("Photo, birth certificate, and testimonial (optional but recommended).", "ছবি, জন্মনিবন্ধন ও প্রশংসাপত্র (ঐচ্ছিক কিন্তু আমরূপ)।")}</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {(Object.keys(UPLOAD_META) as (keyof Files)[]).map((kind) => {
                                        const meta = UPLOAD_META[kind];
                                        const url = files[kind];
                                        return (
                                            <div key={kind} className="space-y-1.5">
                                                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><meta.icon size={10} /> {meta.label}</Label>
                                                {url ? (
                                                    <div className="relative rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 text-center">
                                                        {kind === "photoUrl" ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={url} alt={meta.label} className="size-20 object-cover rounded-lg mx-auto" />
                                                        ) : (
                                                            <a href={url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">{tn("View file", "ফাইল দেখুন")}</a>
                                                        )}
                                                        <p className="text-[10px] text-emerald-600 font-bold mt-1">{tn("Uploaded", "আপলোড হয়েছে")}</p>
                                                        <button type="button" onClick={() => setFiles((f) => ({ ...f, [kind]: undefined }))}
                                                            className="text-[10px] text-destructive underline mt-1 cursor-pointer">{tn("Remove", "সরান")}</button>
                                                    </div>
                                                ) : (
                                                    <label className="flex flex-col items-center justify-center gap-2 h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/40 transition-colors cursor-pointer">
                                                        {uploading === kind ? <FaSpinner className="animate-spin text-primary" size={16} /> : <FaUpload className="text-muted-foreground" size={16} />}
                                                        <span className="text-[10px] text-muted-foreground font-semibold">{tn("Upload", "আপলোড")}</span>
                                                        <input type="file" accept={meta.accept} className="hidden"
                                                            onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile(kind, file); }} />
                                                    </label>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* Note */}
                            <Field label={tn("Additional Note", "অতিরিক্ত মন্তব্য")}>
                                <Textarea className="rounded-md" rows={2} value={form.note} onChange={(e) => set("note", e.target.value)} />
                            </Field>

                            <Button onClick={submit} disabled={busy || !valid}
                                className="w-full h-12 font-black text-sm uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700">
                                {busy ? <><FaSpinner className="animate-spin" size={13} /> {tn("Submitting…", "জমা হচ্ছে…")}</> : tn("Submit Application", "আবেদন জমা দিন")}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </main>
            <Footer />
        </div>
    );
}
