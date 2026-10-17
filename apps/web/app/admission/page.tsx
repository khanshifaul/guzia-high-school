"use client";

// app/admission/page.tsx — public online admission form (no login). Multi-step
// → submit → printable application form + portal credentials (also emailed via
// Resend when configured). The printable view uses window.print() → Save as PDF.

import * as React from "react";
import { motion } from "motion/react";
import { FaGraduationCap, FaArrowRight, FaArrowLeft, FaPrint, FaCircleCheck, FaSpinner } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";
import { useLanguage } from "@/lib/language-context";
import { useSiteConfig } from "@/lib/site-config";
import { api, RequestError } from "@/lib/api";

const CLASSES = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"];

interface FormState {
    studentName: string;
    guardianName: string;
    phone: string;
    email: string;
    classWanted: string;
    previousSchool: string;
}

interface Receipt {
    id: string;
    username: string;
    password: string;
    studentName: string;
    classWanted: string;
    emailSent: boolean;
}

const EMPTY: FormState = {
    studentName: "",
    guardianName: "",
    phone: "",
    email: "",
    classWanted: "",
    previousSchool: "",
};

export default function AdmissionPage() {
    const { t } = useLanguage();
    const cfg = useSiteConfig();
    const [step, setStep] = React.useState(0);
    const [form, setForm] = React.useState<FormState>(EMPTY);
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [receipt, setReceipt] = React.useState<Receipt | null>(null);

    const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

    const stepValid =
        step === 0
            ? form.studentName.trim().length >= 2 && form.classWanted !== ""
            : step === 1
              ? form.guardianName.trim().length >= 2 && /^\d{6,15}$/.test(form.phone.trim()) && /\S+@\S+\.\S+/.test(form.email)
              : true;

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
                    ...(form.previousSchool.trim() ? { previousSchool: form.previousSchool.trim() } : {}),
                },
            });
            setReceipt(res);
        } catch (err) {
            setError(err instanceof RequestError ? err.messages.join("; ") : "Submission failed. Please try again.");
        } finally {
            setBusy(false);
        }
    }

    const tn = (en: string, bn: string) => t(en, bn);
    const STEPS = [tn("Student", "শিক্ষার্থী"), tn("Guardian", "অভিভাবক"), tn("Review", "পর্যালোচনা")];

    // ─── PRINTABLE RECEIPT ───
    if (receipt) {
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

                        {/* Printable application form */}
                        <Card className="border-2 border-border bg-card">
                            <CardContent className="p-8">
                                <div className="text-center border-b border-border pb-4 mb-6">
                                    <div className="inline-flex items-center justify-center size-14 rounded-xl bg-primary/10 mb-2">
                                        <FaGraduationCap className="text-primary" size={28} />
                                    </div>
                                    <h1 className="text-2xl font-black text-primary uppercase tracking-tight">{cfg.schoolName}</h1>
                                    <p className="text-[10px] text-muted-foreground tracking-[0.2em] uppercase mt-1">
                                        Admission Application Form · EIIN: {cfg.eiin} · {cfg.board}
                                    </p>
                                </div>

                                <table className="w-full text-sm border-collapse">
                                    <tbody>
                                        {[
                                            [tn("Application No.", "আবেদন নং"), receipt.id.slice(-8).toUpperCase()],
                                            [tn("Student Name", "শিক্ষার্থীর নাম"), receipt.studentName],
                                            [tn("Guardian Name", "অভিভাবকের নাম"), form.guardianName],
                                            [tn("Phone", "ফোন"), form.phone],
                                            [tn("Email", "ইমেইল"), form.email],
                                            [tn("Class Applied for", "যে শ্রেণিতে আবেদন"), receipt.classWanted],
                                            [tn("Previous School", "পূর্ববর্তী বিদ্যালয়"), form.previousSchool || "—"],
                                            [tn("Date", "তারিখ"), new Date().toLocaleDateString("en-GB")],
                                        ].map(([k, v]) => (
                                            <tr key={k} className="border-b border-border/60">
                                                <td className="py-2.5 pr-4 font-bold text-muted-foreground whitespace-nowrap align-top w-48">{k}</td>
                                                <td className="py-2.5 text-foreground">{v}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div className="mt-6 p-4 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-wider mb-3">
                                        {tn("Portal Login Credentials", "পোর্টাল লগইন পরিচয়পত্র")}
                                    </p>
                                    <table className="w-full text-sm border-collapse">
                                        <tbody>
                                            <tr className="border-b border-border/60">
                                                <td className="py-2 pr-4 font-bold text-muted-foreground w-32">{tn("Username", "ব্যবহারকারী নাম")}</td>
                                                <td className="py-2 font-mono font-bold">{receipt.username}</td>
                                            </tr>
                                            <tr>
                                                <td className="py-2 pr-4 font-bold text-muted-foreground">{tn("Password", "পাসওয়ার্ড")}</td>
                                                <td className="py-2 font-mono font-bold text-primary">{receipt.password}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <p className="text-[10px] text-muted-foreground mt-3">
                                        {tn("Use these to log in and track your application status. Change your password after first login. Do not share.", "অবস্থা ট্র্যাক করতে এগুলো দিয়ে লগইন করুন। প্রথম লগইনের পরে পাসওয়ার্ড পরিবর্তন করুন।")}
                                    </p>
                                </div>

                                <p className="text-[10px] text-muted-foreground mt-6 text-center">
                                    {tn("Application under review. You will be notified once it is processed.", "আবেদন পর্যালোচনাধীন। প্রক্রিয়াকরণের পরে আপনাকে জানানো হবে।")}
                                </p>
                            </CardContent>
                        </Card>

                        <div className="no-print flex flex-col sm:flex-row gap-3 mt-6 justify-center">
                            <Button onClick={() => window.print()} className="gap-2 font-black text-xs uppercase tracking-wider">
                                <FaPrint size={12} /> {tn("Print / Save as PDF", "প্রিন্ট / PDF সংরক্ষণ")}
                            </Button>
                            <Button variant="outline" onClick={() => { setReceipt(null); setForm(EMPTY); setStep(0); }}
                                className="font-black text-xs uppercase tracking-wider">
                                {tn("New Application", "নতুন আবেদন")}
                            </Button>
                        </div>
                    </motion.div>
                </main>

                <div className="no-print"><Footer /></div>
            </div>
        );
    }

    // ─── APPLICATION FORM ───
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 bg-muted/30 py-12">
                <div className="container mx-auto px-4 max-w-2xl">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-black text-primary uppercase tracking-tight">
                            {tn("Online Admission", "অনলাইন ভর্তি")}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-2">
                            {tn("Apply for admission — no account needed. Credentials are issued after you submit.", "ভর্তির আবেদন করুন — কোনো অ্যাকাউন্ট লাগবে না। জমা দেওয়ার পরে পরিচয়পত্র দেওয়া হবে।")}
                        </p>
                    </div>

                    {/* Step indicator */}
                    <div className="flex items-center justify-center gap-2 mb-8">
                        {STEPS.map((s, i) => (
                            <React.Fragment key={s}>
                                <div className={`flex items-center justify-center size-8 rounded-full text-xs font-black ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                                    {i < step ? "✓" : i + 1}
                                </div>
                                <span className={`text-xs font-bold uppercase tracking-wider ${i <= step ? "text-primary" : "text-muted-foreground"}`}>{s}</span>
                                {i < STEPS.length - 1 ? <div className="w-8 h-px bg-border" /> : null}
                            </React.Fragment>
                        ))}
                    </div>

                    <Card className="border-border/60 shadow-md">
                        <div className="h-1.5 bg-gradient-brand w-full rounded-t-xl" />
                        <CardContent className="p-6 md:p-8">
                            {error ? (
                                <div className="p-3.5 mb-5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
                                    {error}
                                </div>
                            ) : null}

                            {step === 0 ? (
                                <div className="space-y-5">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{tn("Student Name", "শিক্ষার্থীর নাম")} *</Label>
                                        <Input className="h-11" value={form.studentName} onChange={(e) => set("studentName", e.target.value)} placeholder={tn("Full name", "পুরো নাম")} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{tn("Class Applied for", "যে শ্রেণিতে আবেদন")} *</Label>
                                        <div className="grid grid-cols-5 gap-2">
                                            {CLASSES.map((c) => (
                                                <button key={c} type="button" onClick={() => set("classWanted", c)}
                                                    className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors cursor-pointer ${form.classWanted === c ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
                                                    {c.replace("Class ", "")}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{tn("Previous School (optional)", "পূর্ববর্তী বিদ্যালয়")}</Label>
                                        <Input className="h-11" value={form.previousSchool} onChange={(e) => set("previousSchool", e.target.value)} />
                                    </div>
                                </div>
                            ) : step === 1 ? (
                                <div className="space-y-5">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{tn("Guardian Name", "অভিভাবকের নাম")} *</Label>
                                        <Input className="h-11" value={form.guardianName} onChange={(e) => set("guardianName", e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{tn("Phone", "ফোন")} *</Label>
                                        <Input className="h-11" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="017XXXXXXXX" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{tn("Email", "ইমেইল")} *</Label>
                                        <Input className="h-11" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" />
                                        <p className="text-[10px] text-muted-foreground mt-1">{tn("Your portal credentials will be sent here.", "আপনার পোর্টাল পরিচয়পত্র এখানে পাঠানো হবে।")}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-3">{tn("Review your application", "আপনার আবেদন পর্যালোচনা করুন")}</p>
                                    {[
                                        [tn("Student Name", "শিক্ষার্থীর নাম"), form.studentName],
                                        [tn("Class", "শ্রেণি"), form.classWanted],
                                        [tn("Guardian", "অভিভাবক"), form.guardianName],
                                        [tn("Phone", "ফোন"), form.phone],
                                        [tn("Email", "ইমেইল"), form.email],
                                        [tn("Previous School", "পূর্ববর্তী বিদ্যালয়"), form.previousSchool || "—"],
                                    ].map(([k, v]) => (
                                        <div key={k} className="flex justify-between border-b border-border/60 pb-2 text-sm">
                                            <span className="font-bold text-muted-foreground">{k}</span>
                                            <span className="text-foreground">{v}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex justify-between mt-8">
                                <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
                                    className="gap-2 font-black text-xs uppercase tracking-wider">
                                    <FaArrowLeft size={12} /> {tn("Back", "পিছনে")}
                                </Button>
                                {step < STEPS.length - 1 ? (
                                    <Button onClick={() => setStep((s) => s + 1)} disabled={!stepValid}
                                        className="gap-2 font-black text-xs uppercase tracking-wider">
                                        {tn("Next", "পরবর্তী")} <FaArrowRight size={12} />
                                    </Button>
                                ) : (
                                    <Button onClick={submit} disabled={busy}
                                        className="gap-2 font-black text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700">
                                        {busy ? <><FaSpinner className="animate-spin" size={12} /> {tn("Submitting…", "জমা হচ্ছে…")}</> : <>{tn("Submit Application", "আবেদন জমা দিন")} <FaArrowRight size={12} /></>}
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
            <Footer />
        </div>
    );
}
