"use client";

// app/admission/page.tsx — public online admission form (no login). Mirrors a
// Bangladeshi school admission form: student personal info, parents, local
// guardian, present & permanent address, academic history, quota, declaration,
// and attachments. Submit → printable application form + portal credentials.

import * as React from "react";
import { motion } from "motion/react";
import { FaGraduationCap, FaPrint, FaCircleCheck, FaSpinner, FaUpload, FaImage, FaFileLines, FaAward } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";
import { useLanguage } from "@/lib/language-context";
import { useSiteConfig } from "@/lib/site-config";
import { api, RequestError } from "@/lib/api";

const CLASSES = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"];
const RELATIONS = ["father", "mother", "guardian"];
const RELIGIONS = ["islam", "hinduism", "christianity", "buddhism", "other"];
const RELIGION_BN: Record<string, string> = { islam: "ইসলাম", hinduism: "হিন্দু", christianity: "খ্রিস্টান", buddhism: "বৌদ্ধ", other: "অন্যান্য" };
const BLOOD_GROUPS = ["A+", "A-", "B+", "AB+", "AB-", "O+", "O-"];
const GROUPS = ["science", "humanities", "business"];
const GROUP_BN: Record<string, string> = { science: "বিজ্ঞান", humanities: "মানবিক", business: "ব্যবসায় শিক্ষা" };
const ADMISSION_TYPES = ["day", "residential"];
const ADMISSION_TYPE_BN: Record<string, string> = { day: "দিবা (Day)", residential: "আবাসিক (Residential)" };
const QUOTAS = ["general", "freedom-fighter", "employee", "staff-child", "sibling", "tribal"];
const QUOTA_BN: Record<string, string> = { general: "সাধারণ", "freedom-fighter": "মুক্তিযোদ্ধা", employee: "কর্মচারী", "staff-child": "স্টাফ সন্তান", sibling: "ভাই/বোন", tribal: "উপজাতি" };
const PREVIOUS_CLASSES = ["Playgroup", "Nursery", "KG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9"];

interface FormState {
    studentName: string; studentNameBn: string; dateOfBirth: string; age: string; gender: string;
    birthCertNo: string; religion: string; nationality: string; bloodGroup: string;
    fatherName: string; fatherNameBn: string; fatherProfession: string; fatherNid: string; fatherPhone: string;
    motherName: string; motherNameBn: string; motherProfession: string; motherNid: string; motherPhone: string;
    guardianName: string; guardianRelation: string; localGuardianProfession: string; guardianNid: string;
    phone: string; emergencyPhone: string; email: string;
    presentVillage: string; presentRoad: string; presentWard: string; presentPostOffice: string;
    presentPoliceStation: string; presentUpazila: string; presentDistrict: string; presentPostalCode: string;
    permanentSameAsPresent: boolean;
    permanentVillage: string; permanentRoad: string; permanentWard: string; permanentPostOffice: string;
    permanentPoliceStation: string; permanentUpazila: string; permanentDistrict: string; permanentPostalCode: string;
    classWanted: string; section: string; group: string; admissionType: string;
    previousSchool: string; previousClass: string; previousResult: string; tcNumber: string; tcDate: string; previousSchoolPhone: string;
    quota: string; declarationAccepted: boolean; note: string;
}
interface Files { photoUrl?: string; birthCertUrl?: string; testimonialUrl?: string }
interface Receipt extends Files {
    id: string; username: string; password: string; studentName: string; classWanted: string; emailSent: boolean;
}

const EMPTY: FormState = {
    studentName: "", studentNameBn: "", dateOfBirth: "", age: "", gender: "", birthCertNo: "",
    religion: "", nationality: "Bangladeshi", bloodGroup: "",
    fatherName: "", fatherNameBn: "", fatherProfession: "", fatherNid: "", fatherPhone: "",
    motherName: "", motherNameBn: "", motherProfession: "", motherNid: "", motherPhone: "",
    guardianName: "", guardianRelation: "father", localGuardianProfession: "", guardianNid: "",
    phone: "", emergencyPhone: "", email: "",
    presentVillage: "", presentRoad: "", presentWard: "", presentPostOffice: "",
    presentPoliceStation: "", presentUpazila: "", presentDistrict: "", presentPostalCode: "",
    permanentSameAsPresent: true,
    permanentVillage: "", permanentRoad: "", permanentWard: "", permanentPostOffice: "",
    permanentPoliceStation: "", permanentUpazila: "", permanentDistrict: "", permanentPostalCode: "",
    classWanted: "", section: "", group: "", admissionType: "day",
    previousSchool: "", previousClass: "", previousResult: "", tcNumber: "", tcDate: "", previousSchoolPhone: "",
    quota: "general", declarationAccepted: false, note: "",
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
        /\S+@\S+\.\S+/.test(form.email) && form.declarationAccepted;

    async function submit() {
        setBusy(true);
        setError(null);
        const same = form.permanentSameAsPresent;
        const body: Record<string, unknown> = {
            studentName: form.studentName.trim(),
            guardianName: form.guardianName.trim(),
            phone: form.phone.trim(),
            email: form.email.trim(),
            classWanted: form.classWanted,
            declarationAccepted: form.declarationAccepted,
            ...files,
        };
        const opt: (keyof FormState)[] = [
            "studentNameBn", "dateOfBirth", "gender", "birthCertNo", "religion", "nationality", "bloodGroup",
            "fatherName", "fatherNameBn", "fatherProfession", "fatherNid", "fatherPhone",
            "motherName", "motherNameBn", "motherProfession", "motherNid", "motherPhone",
            "guardianRelation", "localGuardianProfession", "guardianNid", "emergencyPhone",
            "presentVillage", "presentRoad", "presentWard", "presentPostOffice", "presentPoliceStation",
            "presentUpazila", "presentDistrict", "presentPostalCode",
            "section", "group", "admissionType", "previousSchool", "previousClass", "previousResult",
            "tcNumber", "tcDate", "previousSchoolPhone", "quota", "note",
        ];
        for (const k of opt) {
            const v = form[k];
            if (typeof v === "string" && v.trim()) body[k] = v.trim();
            else if (typeof v === "string" && ["religion", "bloodGroup", "group", "quota", "admissionType", "previousClass", "guardianRelation"].includes(k) && v) body[k] = v;
        }
        if (form.age) body.age = Number(form.age) || undefined;
        body.permanentSameAsPresent = same;
        if (same) {
            body.permanentVillage = form.presentVillage; body.permanentRoad = form.presentRoad;
            body.permanentWard = form.presentWard; body.permanentPostOffice = form.presentPostOffice;
            body.permanentPoliceStation = form.presentPoliceStation; body.permanentUpazila = form.presentUpazila;
            body.permanentDistrict = form.presentDistrict; body.permanentPostalCode = form.presentPostalCode;
        } else {
            for (const k of ["permanentVillage", "permanentRoad", "permanentWard", "permanentPostOffice", "permanentPoliceStation", "permanentUpazila", "permanentDistrict", "permanentPostalCode"] as const) {
                if (form[k]) body[k] = form[k];
            }
        }
        try {
            const res = await api<Receipt>("/admissions", { method: "POST", body });
            setReceipt(res);
        } catch (err) {
            setError(err instanceof RequestError ? err.messages.join("; ") : "Submission failed. Please try again.");
        } finally {
            setBusy(false);
        }
    }

    // ─── PRINTABLE RECEIPT ───
    if (receipt) {
        const permAddr = form.permanentSameAsPresent
            ? [form.presentVillage, form.presentRoad, form.presentWard, form.presentPostOffice, form.presentPoliceStation, form.presentUpazila, form.presentDistrict, form.presentPostalCode].filter(Boolean).join(", ")
            : [form.permanentVillage, form.permanentRoad, form.permanentWard, form.permanentPostOffice, form.permanentPoliceStation, form.permanentUpazila, form.permanentDistrict, form.permanentPostalCode].filter(Boolean).join(", ");
        const presAddr = [form.presentVillage, form.presentRoad, form.presentWard, form.presentPostOffice, form.presentPoliceStation, form.presentUpazila, form.presentDistrict, form.presentPostalCode].filter(Boolean).join(", ");
        const rows: [string, string][] = [
            [tn("Application No.", "আবেদন নং"), receipt.id.slice(-8).toUpperCase()],
            [tn("Student Name (EN)", "নাম (ইংরেজি)"), receipt.studentName],
            [tn("Student Name (BN)", "নাম (বাংলা)"), form.studentNameBn || "—"],
            [tn("Date of Birth", "জন্মতারিখ"), form.dateOfBirth || "—"],
            [tn("Age", "বয়স"), form.age || "—"],
            [tn("Gender", "লিঙ্গ"), form.gender || "—"],
            [tn("Birth Cert. No.", "জন্মনিবন্ধন নং"), form.birthCertNo || "—"],
            [tn("Religion", "ধর্ম"), form.religion ? tn(form.religion, RELIGION_BN[form.religion] ?? form.religion) : "—"],
            [tn("Nationality", "জাতীয়তা"), form.nationality || "—"],
            [tn("Blood Group", "রক্তের গ্রুপ"), form.bloodGroup || "—"],
            [tn("Father", "পিতা"), [form.fatherName, form.fatherProfession && `(${form.fatherProfession})`].filter(Boolean).join(" ") || "—"],
            [tn("Father NID", "পিতার আইডি"), form.fatherNid || "—"],
            [tn("Father Phone", "পিতার ফোন"), form.fatherPhone || "—"],
            [tn("Mother", "মাতা"), [form.motherName, form.motherProfession && `(${form.motherProfession})`].filter(Boolean).join(" ") || "—"],
            [tn("Mother NID", "মাতার আইডি"), form.motherNid || "—"],
            [tn("Mother Phone", "মাতার ফোন"), form.motherPhone || "—"],
            [tn("Guardian", "অভিভাবক"), form.guardianName],
            [tn("Relation", "সম্পর্ক"), form.guardianRelation || "—"],
            [tn("Phone", "ফোন"), form.phone],
            [tn("Emergency Phone", "জরুরি ফোন"), form.emergencyPhone || "—"],
            [tn("Email", "ইমেইল"), form.email],
            [tn("Present Address", "বর্তমান ঠিকানা"), presAddr || "—"],
            [tn("Permanent Address", "স্থায়ী ঠিকানা"), permAddr || "—"],
            [tn("Class Applied for", "যে শ্রেণিতে আবেদন"), receipt.classWanted],
            [tn("Group", "বিভাগ"), form.group ? tn(form.group, GROUP_BN[form.group] ?? form.group) : "—"],
            [tn("Admission Type", "ভর্তির ধরন"), form.admissionType ? tn(form.admissionType, ADMISSION_TYPE_BN[form.admissionType] ?? form.admissionType) : "—"],
            [tn("Previous School", "পূর্ববর্তী বিদ্যালয়"), form.previousSchool || "—"],
            [tn("Previous Class / Result", "পূর্বের শ্রেণি / ফল"), [form.previousClass, form.previousResult].filter(Boolean).join(" — ") || "—"],
            [tn("TC No. / Date", "টিসি নং / তারিখ"), [form.tcNumber, form.tcDate].filter(Boolean).join(" — ") || "—"],
            [tn("Quota", "কোটা"), form.quota && form.quota !== "general" ? tn(form.quota, QUOTA_BN[form.quota] ?? form.quota) : tn("General", "সাধারণ")],
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
                                                <td className="py-2.5 pr-4 font-bold text-muted-foreground whitespace-nowrap align-top w-56">{k}</td>
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

    // ─── FORM ───
    const Field = ({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) => {
        const id = React.useId();
        const child = React.isValidElement(children)
            ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, { id })
            : children;
        return (
            <div className={`space-y-1.5 ${span2 ? "md:col-span-2" : ""}`}>
                <Label htmlFor={id} className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{label}</Label>
                {child}
            </div>
        );
    };
    const Section = ({ n, title, titleBn, children }: { n: number; title: string; titleBn: string; children: React.ReactNode }) => (
        <section>
            <p className="text-[10px] font-black text-primary uppercase tracking-wider mb-4">{tn(`${n}. ${title}`, `${n}. ${titleBn}`)}</p>
            {children}
        </section>
    );
    const Toggle = ({ value, current, onPick, label }: { value: string; current: string; onPick: (v: string) => void; label: string }) => (
        <button type="button" onClick={() => onPick(value)}
            className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${current === value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
            {label}
        </button>
    );

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 bg-muted/30 py-10">
                <div className="container mx-auto px-4 max-w-4xl">
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

                            {/* 1. Student personal */}
                            <Section n={1} title="Student Information" titleBn="শিক্ষার্থীর তথ্য">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Field label={`${tn("Student Name (English)", "নাম (ইংরেজি)")} *`}><Input className="h-11" value={form.studentName} onChange={(e) => set("studentName", e.target.value)} /></Field>
                                    <Field label={tn("Student Name (Bangla)", "নাম (বাংলা)")}><Input className="h-11" value={form.studentNameBn} onChange={(e) => set("studentNameBn", e.target.value)} /></Field>
                                    <Field label={tn("Date of Birth", "জন্মতারিখ")}><Input className="h-11" type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} /></Field>
                                    <Field label={tn("Age", "বয়স")}><Input className="h-11" type="number" min={0} value={form.age} onChange={(e) => set("age", e.target.value)} /></Field>
                                    <Field label={tn("Gender", "লিঙ্গ")}>
                                        <div className="flex gap-2">
                                            {["male", "female"].map((g) => <Toggle key={g} value={g} current={form.gender} onPick={(v) => set("gender", v)} label={tn(g, g === "male" ? "পুরুষ" : "নারী")} />)}
                                        </div>
                                    </Field>
                                    <Field label={tn("Birth Cert. No.", "জন্মনিবন্ধন নং")}><Input className="h-11" value={form.birthCertNo} onChange={(e) => set("birthCertNo", e.target.value)} /></Field>
                                    <Field label={tn("Religion", "ধর্ম")}>
                                        <Select value={form.religion || undefined} onValueChange={(v) => set("religion", v)} label="Religion">
                                            <SelectTrigger className="h-11"><SelectValue placeholder="Select religion" /></SelectTrigger>
                                            <SelectContent searchable>{RELIGIONS.map((r) => <SelectItem key={r} value={r}>{tn(r, RELIGION_BN[r])}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </Field>
                                    <Field label={tn("Nationality", "জাতীয়তা")}><Input className="h-11" value={form.nationality} onChange={(e) => set("nationality", e.target.value)} /></Field>
                                    <Field label={tn("Blood Group", "রক্তের গ্রুপ")}>
                                        <Select value={form.bloodGroup || undefined} onValueChange={(v) => set("bloodGroup", v)} label="Blood group">
                                            <SelectTrigger className="h-11"><SelectValue placeholder="Select blood group" /></SelectTrigger>
                                            <SelectContent searchable>{BLOOD_GROUPS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </Field>
                                </div>
                            </Section>

                            {/* 2. Parents */}
                            <Section n={2} title="Parent Information" titleBn="অভিভাবকের তথ্য">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">{tn("Father", "পিতা")}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                    <Field label={tn("Father Name", "পিতার নাম")}><Input className="h-11" value={form.fatherName} onChange={(e) => set("fatherName", e.target.value)} /></Field>
                                    <Field label={tn("Father Name (Bangla)", "পিতার নাম (বাংলা)")}><Input className="h-11" value={form.fatherNameBn} onChange={(e) => set("fatherNameBn", e.target.value)} /></Field>
                                    <Field label={tn("Profession", "পেশা")}><Input className="h-11" value={form.fatherProfession} onChange={(e) => set("fatherProfession", e.target.value)} /></Field>
                                    <Field label={tn("NID / Passport", "আইডি নং")}><Input className="h-11" value={form.fatherNid} onChange={(e) => set("fatherNid", e.target.value)} /></Field>
                                    <Field label={tn("Mobile", "মোবাইল")}><Input className="h-11" value={form.fatherPhone} onChange={(e) => set("fatherPhone", e.target.value)} placeholder="017XXXXXXXX" /></Field>
                                </div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2">{tn("Mother", "মাতা")}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Field label={tn("Mother Name", "মাতার নাম")}><Input className="h-11" value={form.motherName} onChange={(e) => set("motherName", e.target.value)} /></Field>
                                    <Field label={tn("Mother Name (Bangla)", "মাতার নাম (বাংলা)")}><Input className="h-11" value={form.motherNameBn} onChange={(e) => set("motherNameBn", e.target.value)} /></Field>
                                    <Field label={tn("Profession", "পেশা")}><Input className="h-11" value={form.motherProfession} onChange={(e) => set("motherProfession", e.target.value)} /></Field>
                                    <Field label={tn("NID / Passport", "আইডি নং")}><Input className="h-11" value={form.motherNid} onChange={(e) => set("motherNid", e.target.value)} /></Field>
                                    <Field label={tn("Mobile", "মোবাইল")}><Input className="h-11" value={form.motherPhone} onChange={(e) => set("motherPhone", e.target.value)} placeholder="017XXXXXXXX" /></Field>
                                </div>
                            </Section>

                            {/* 3. Guardian & contact */}
                            <Section n={3} title="Guardian & Contact" titleBn="অভিভাবক ও যোগাযোগ">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Field label={`${tn("Guardian Name", "অভিভাবকের নাম")} *`}><Input className="h-11" value={form.guardianName} onChange={(e) => set("guardianName", e.target.value)} /></Field>
                                    <Field label={tn("Relation", "সম্পর্ক")}>
                                        <div className="flex gap-2">
                                            {RELATIONS.map((r) => <Toggle key={r} value={r} current={form.guardianRelation} onPick={(v) => set("guardianRelation", v)} label={tn(r, r === "father" ? "পিতা" : r === "mother" ? "মাতা" : "অভিভাবক")} />)}
                                        </div>
                                    </Field>
                                    <Field label={tn("Guardian Profession", "অভিভাবকের পেশা")}><Input className="h-11" value={form.localGuardianProfession} onChange={(e) => set("localGuardianProfession", e.target.value)} /></Field>
                                    <Field label={tn("Guardian NID / BRN", "অভিভাবকের আইডি")}><Input className="h-11" value={form.guardianNid} onChange={(e) => set("guardianNid", e.target.value)} /></Field>
                                    <Field label={`${tn("Phone", "ফোন")} *`}><Input className="h-11" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="017XXXXXXXX" /></Field>
                                    <Field label={tn("Emergency Phone", "জরুরি মোবাইল")}><Input className="h-11" value={form.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} placeholder="017XXXXXXXX" /></Field>
                                    <Field label={`${tn("Email", "ইমেইল")} *`} span2><Input className="h-11" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
                                </div>
                            </Section>

                            {/* 4. Present address */}
                            <Section n={4} title="Present Address" titleBn="বর্তমান ঠিকানা">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Field label={tn("Village / House", "গ্রাম / বাড়ি")}><Input className="h-11" value={form.presentVillage} onChange={(e) => set("presentVillage", e.target.value)} /></Field>
                                    <Field label={tn("Road No.", "রোড নং")}><Input className="h-11" value={form.presentRoad} onChange={(e) => set("presentRoad", e.target.value)} /></Field>
                                    <Field label={tn("Ward / Section", "ওয়ার্ড / সেকশন")}><Input className="h-11" value={form.presentWard} onChange={(e) => set("presentWard", e.target.value)} /></Field>
                                    <Field label={tn("Post Office", "ডাকঘর")}><Input className="h-11" value={form.presentPostOffice} onChange={(e) => set("presentPostOffice", e.target.value)} /></Field>
                                    <Field label={tn("Police Station", "থানা")}><Input className="h-11" value={form.presentPoliceStation} onChange={(e) => set("presentPoliceStation", e.target.value)} /></Field>
                                    <Field label={tn("Upazila", "উপজেলা")}><Input className="h-11" value={form.presentUpazila} onChange={(e) => set("presentUpazila", e.target.value)} /></Field>
                                    <Field label={tn("District", "জেলা")}><Input className="h-11" value={form.presentDistrict} onChange={(e) => set("presentDistrict", e.target.value)} /></Field>
                                    <Field label={tn("Postal Code", "পোস্টাল কোড")}><Input className="h-11" value={form.presentPostalCode} onChange={(e) => set("presentPostalCode", e.target.value)} /></Field>
                                </div>
                            </Section>

                            {/* 5. Permanent address */}
                            <Section n={5} title="Permanent Address" titleBn="স্থায়ী ঠিকানা">
                                <label className="flex items-center gap-2.5 mb-4 cursor-pointer">
                                    <Checkbox checked={form.permanentSameAsPresent} onCheckedChange={(v) => setForm((f) => ({ ...f, permanentSameAsPresent: v === true }))} />
                                    <span className="text-xs font-semibold">{tn("Same as present address", "বর্তমান ঠিকানার মতোই")}</span>
                                </label>
                                {!form.permanentSameAsPresent ? (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <Field label={tn("Village / House", "গ্রাম / বাড়ি")}><Input className="h-11" value={form.permanentVillage} onChange={(e) => set("permanentVillage", e.target.value)} /></Field>
                                        <Field label={tn("Road No.", "রোড নং")}><Input className="h-11" value={form.permanentRoad} onChange={(e) => set("permanentRoad", e.target.value)} /></Field>
                                        <Field label={tn("Ward / Section", "ওয়ার্ড / সেকশন")}><Input className="h-11" value={form.permanentWard} onChange={(e) => set("permanentWard", e.target.value)} /></Field>
                                        <Field label={tn("Post Office", "ডাকঘর")}><Input className="h-11" value={form.permanentPostOffice} onChange={(e) => set("permanentPostOffice", e.target.value)} /></Field>
                                        <Field label={tn("Police Station", "থানা")}><Input className="h-11" value={form.permanentPoliceStation} onChange={(e) => set("permanentPoliceStation", e.target.value)} /></Field>
                                        <Field label={tn("Upazila", "উপজেলা")}><Input className="h-11" value={form.permanentUpazila} onChange={(e) => set("permanentUpazila", e.target.value)} /></Field>
                                        <Field label={tn("District", "জেলা")}><Input className="h-11" value={form.permanentDistrict} onChange={(e) => set("permanentDistrict", e.target.value)} /></Field>
                                        <Field label={tn("Postal Code", "পোস্টাল কোড")}><Input className="h-11" value={form.permanentPostalCode} onChange={(e) => set("permanentPostalCode", e.target.value)} /></Field>
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground">{tn("Copied from present address on submit.", "জমা দেওয়ার সময় বর্তমান ঠিকানা থেকে নেওয়া হবে।")}</p>
                                )}
                            </Section>

                            {/* 6. Academic & admission */}
                            <Section n={6} title="Academic & Admission" titleBn="একাডেমিক ও ভর্তি">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Field label={`${tn("Class Applied for", "যে শ্রেণিতে আবেদন")} *`}>
                                        <div className="grid grid-cols-5 gap-2">
                                            {CLASSES.map((c) => <Toggle key={c} value={c} current={form.classWanted} onPick={(v) => set("classWanted", v)} label={c.replace("Class ", "")} />)}
                                        </div>
                                    </Field>
                                    <Field label={tn("Section", "শাখা")}><Input className="h-11" value={form.section} onChange={(e) => set("section", e.target.value)} placeholder="A / B" /></Field>
                                    <Field label={tn("Group", "বিভাগ")}>
                                        <Select value={form.group || undefined} onValueChange={(v) => set("group", v)} label="Group">
                                            <SelectTrigger className="h-11"><SelectValue placeholder="Select group (Class 9–10)" /></SelectTrigger>
                                            <SelectContent searchable>{GROUPS.map((g) => <SelectItem key={g} value={g}>{tn(g, GROUP_BN[g])}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </Field>
                                    <Field label={tn("Admission Type", "ভর্তির ধরন")}>
                                        <Select value={form.admissionType} onValueChange={(v) => set("admissionType", v)} label="Admission type">
                                            <SelectTrigger className="h-11"><SelectValue placeholder="Select type" /></SelectTrigger>
                                            <SelectContent>{ADMISSION_TYPES.map((a) => <SelectItem key={a} value={a}>{tn(a, ADMISSION_TYPE_BN[a])}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </Field>
                                    <Field label={tn("Previous School", "পূর্ববর্তী বিদ্যালয়")}><Input className="h-11" value={form.previousSchool} onChange={(e) => set("previousSchool", e.target.value)} /></Field>
                                    <Field label={tn("Previous Class", "পূর্বের শ্রেণি")}>
                                        <Select value={form.previousClass || undefined} onValueChange={(v) => set("previousClass", v)} label="Previous class">
                                            <SelectTrigger className="h-11"><SelectValue placeholder="Select previous class" /></SelectTrigger>
                                            <SelectContent searchable>{PREVIOUS_CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </Field>
                                    <Field label={tn("Previous Result / GPA", "পূর্ববর্তী ফলাফল / জিপিএ")}><Input className="h-11" value={form.previousResult} onChange={(e) => set("previousResult", e.target.value)} placeholder="5.00 / Division" /></Field>
                                    <Field label={tn("Previous School Phone", "পূর্বের বিদ্যালয়ের ফোন")}><Input className="h-11" value={form.previousSchoolPhone} onChange={(e) => set("previousSchoolPhone", e.target.value)} /></Field>
                                    <Field label={tn("TC Number", "টিসি নং")}><Input className="h-11" value={form.tcNumber} onChange={(e) => set("tcNumber", e.target.value)} /></Field>
                                    <Field label={tn("TC Date", "টিসি তারিখ")}><Input className="h-11" type="date" value={form.tcDate} onChange={(e) => set("tcDate", e.target.value)} /></Field>
                                </div>
                            </Section>

                            {/* 7. Quota & declaration */}
                            <Section n={7} title="Quota & Declaration" titleBn="কোটা ও ঘোষণা">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <Field label={tn("Quota", "কোটা")}>
                                        <Select value={form.quota} onValueChange={(v) => set("quota", v)} label="Quota">
                                            <SelectTrigger className="h-11"><SelectValue placeholder="General" /></SelectTrigger>
                                            <SelectContent searchable>{QUOTAS.map((q) => <SelectItem key={q} value={q}>{tn(q, QUOTA_BN[q])}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </Field>
                                </div>
                                <label className="flex items-start gap-2.5 cursor-pointer">
                                    <span className="mt-0.5"><Checkbox checked={form.declarationAccepted} onCheckedChange={(v) => setForm((f) => ({ ...f, declarationAccepted: v === true }))} /></span>
                                    <span className="text-xs text-muted-foreground leading-relaxed">
                                        {tn("I declare that the information provided is true and agree to abide by all rules and regulations of the institution.",
                                            "আমি ঘোষণা করছি যে প্রদত্ত তথ্য সত্য এবং প্রতিষ্ঠানের সকল নিয়ম-কানুন মেনে চলতে প্রতিশ্রুতিবদ্ধ।")}
                                    </span>
                                </label>
                            </Section>

                            {/* 8. Attachments */}
                            <Section n={8} title="Attachments" titleBn="সংযুক্তি">
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
                            </Section>

                            <Field label={tn("Additional Note", "অতিরিক্ত মন্তব্য")}>
                                <Textarea className="rounded-md" rows={2} value={form.note} onChange={(e) => set("note", e.target.value)} />
                            </Field>

                            <Button onClick={submit} disabled={busy || !valid}
                                className="w-full h-12 font-black text-sm uppercase tracking-wider bg-emerald-700 hover:bg-emerald-800">
                                {busy ? <><FaSpinner className="animate-spin" size={13} /> {tn("Submitting…", "জমা হচ্ছে…")}</> : tn("Submit Application", "আবেদন জমা দিন")}
                            </Button>
                            {!form.declarationAccepted ? (
                                <p className="text-[10px] text-muted-foreground text-center -mt-2">{tn("Please accept the declaration to submit.", "জমা দিতে ঘোষণাটি গ্রহণ করুন।")}</p>
                            ) : null}
                        </CardContent>
                    </Card>
                </div>
            </main>
            <Footer />
        </div>
    );
}
