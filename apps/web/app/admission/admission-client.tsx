"use client";

// app/admission/admission-client.tsx — the body of the public admission
// page: either the four-step wizard, or the printable application sheet.
//
// The route decides which by reading `?print=1` on the server (page.tsx)
// and passing the flag down, so the page needs no `useSearchParams()` and
// no Suspense boundary.
//
// The sheet is the DEFAULT rendering of the print route: it carries no
// buttons, no navigation and no portal chrome, so what the applicant
// prints is the application and nothing else. The screen-only toolbar
// (print / back) is hidden on paper with `print:hidden`.

import * as React from "react";
import { useRouter } from "next/navigation";
import {
    FaCircleCheck,
    FaSpinner,
    FaUpload,
    FaPrint,
    FaImage,
    FaFileLines,
    FaAward,
    FaArrowLeft,
    FaArrowRight,
    FaPen,
} from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navbar } from "@/components/public/navbar";
import { Footer } from "@/components/public/footer";
import {
    AdmissionApplicationSheet,
    type ApplicationLetterhead,
} from "@/components/shared/admission-application";
import { ageFromDateOfBirth } from "@/lib/age";
import { useLanguage } from "@/lib/language-context";
import { useSiteConfig } from "@/lib/site-config";
import { api, RequestError } from "@/lib/api";
import {
    ADMISSION_STEPS,
    BLOOD_GROUPS,
    CLASSES,
    GENDERS,
    GROUPS,
    QUOTAS,
    RELATIONS,
    RELIGIONS,
    STEP_FIELDS,
    academicStepSchema,
    admissionSchema,
    classHasGroups,
    fieldErrors,
    guardianStepSchema,
    previousClassOptions,
    reviewStepSchema,
    stepForField,
    studentStepSchema,
} from "@/lib/zod-schemas/admission";
import {
    APPLICATION_ATTACHMENTS,
    ADMISSION_TYPE_BN,
    EMPTY_APPLICATION,
    GENDER_BN,
    GROUP_BN,
    QUOTA_BN,
    RELATION_BN,
    RELIGION_BN,
    type AdmissionReceipt,
    type ApplicationFiles,
    type ApplicationForm,
} from "@/lib/admission-application";

/** The photo is printed on the ID card, so it has a fixed shape and size. */
const PHOTO_MAX_BYTES = 1024 * 1024;
const PHOTO_SIZE = 300;

/** Why this photo breaks the rule, or null when it is fine (mirrors the API). */
async function photoProblem(file: File): Promise<string | null> {
    if (!file.type.startsWith("image/")) return "The photo must be an image.";
    if (file.size > PHOTO_MAX_BYTES) return "The photo must be 1 MB or smaller.";
    try {
        const bitmap = await createImageBitmap(file);
        const { width, height } = bitmap;
        bitmap.close();
        if (width !== PHOTO_SIZE || height !== PHOTO_SIZE) {
            return `The photo must be exactly ${PHOTO_SIZE}×${PHOTO_SIZE} px (yours is ${width}×${height}).`;
        }
        return null;
    } catch {
        return "That image could not be read.";
    }
}

/** The API's error envelope carries the useful sentence in `message`. */
function uploadErrorMessage(data: unknown): string {
    if (data && typeof data === "object" && "message" in data) {
        const raw = data.message;
        if (Array.isArray(raw)) return raw.map(String).join("; ");
        if (typeof raw === "string") return raw;
    }
    return "Upload failed";
}

/** The icon each attachment is labelled with in the upload box. */
const ATTACHMENT_ICONS: Record<keyof ApplicationFiles, (props: { size?: number }) => React.ReactElement> = {
    photoUrl: (props) => <FaImage {...props} />,
    birthCertUrl: (props) => <FaFileLines {...props} />,
    testimonialUrl: (props) => <FaAward {...props} />,
};

export default function AdmissionClient({ print }: { print: boolean }) {
    const { t, language } = useLanguage();
    const cfg = useSiteConfig();
    const router = useRouter();
    const [form, setForm] = React.useState<ApplicationForm>(EMPTY_APPLICATION);
    const [files, setFiles] = React.useState<ApplicationFiles>({});
    const [uploading, setUploading] = React.useState<keyof ApplicationFiles | null>(null);
    const [uploadErrors, setUploadErrors] = React.useState<Partial<Record<keyof ApplicationFiles, string>>>({});
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [receipt, setReceipt] = React.useState<AdmissionReceipt | null>(null);
    const [step, setStep] = React.useState(0);
    const [errors, setErrors] = React.useState<Record<string, string>>({});
    // The print route reads its content from the session, so the sheet has
    // to wait for the session to be read before it can be drawn.
    const [restored, setRestored] = React.useState(!print);

    // The printable form can be reopened from the success screen: the
    // values the applicant typed ride along in sessionStorage next to the
    // receipt, so /admission?print=1 rebuilds the form from them.
    React.useEffect(() => {
        if (!print) return;
        try {
            const rawReceipt = sessionStorage.getItem("admissionReceipt");
            const rawPrint = sessionStorage.getItem("admissionPrintData");
            if (rawReceipt) setReceipt(JSON.parse(rawReceipt) as AdmissionReceipt);
            if (rawPrint) {
                const stored = JSON.parse(rawPrint) as { form: ApplicationForm; files: ApplicationFiles };
                setForm({ ...EMPTY_APPLICATION, ...stored.form });
                setFiles(stored.files ?? {});
            }
        } catch {
            // A corrupt entry means there is nothing to print.
        } finally {
            setRestored(true);
        }
    }, [print]);

    // Auto-print once the sheet is ready — wait for fonts so the print does
    // not fall back to a default face mid-layout. The ref guard keeps it to
    // exactly one print dialog: React re-runs effects in development, and a
    // second dialog would block the applicant behind two print previews.
    const printed = React.useRef(false);
    React.useEffect(() => {
        if (!print || !restored || printed.current) return;
        printed.current = true;
        (async () => {
            await document.fonts.ready;
            window.print();
        })();
    }, [print, restored]);

    const tn = (en: string, bn: string) => t(en, bn);

    // The site settings decide which admission types and shifts this school
    // offers. Narrow the answer if the admin has removed the current one.
    React.useEffect(() => {
        setForm((f) => {
            const admissionType = cfg.admissionTypes.includes(f.admissionType)
                ? f.admissionType
                : (cfg.admissionTypes[0] ?? "");
            const shift = cfg.shifts.length === 0
                ? ""
                : cfg.shifts.includes(f.shift)
                    ? f.shift
                    : (cfg.shifts.length === 1 ? cfg.shifts[0] : "");
            if (admissionType === f.admissionType && shift === f.shift) return f;
            return { ...f, admissionType, shift };
        });
    }, [cfg.admissionTypes, cfg.shifts]);

    // The age is derived from the date of birth, never typed in. This is a
    // preview for the applicant; the server recomputes the age on submit
    // (apps/api/src/common/age.util.ts) and stores that one.
    const derivedAge = ageFromDateOfBirth(form.dateOfBirth);
    // Editing a field clears its error, so a message never outlives the
    // mistake that caused it.
    const clearError = (k: string) => setErrors((e) => {
        if (!(k in e)) return e;
        const next = { ...e };
        delete next[k];
        return next;
    });
    const set = (k: keyof ApplicationForm, v: string) => {
        clearError(k);
        setForm((f) => ({ ...f, [k]: v }));
    };
    const setBoolean = (k: keyof ApplicationForm, v: boolean) => {
        clearError(k);
        setForm((f) => ({ ...f, [k]: v }));
    };
    // The group exists only in Class 9-10 and the previous class must be below
    // the class applied for, so a class change drops now-invalid answers.
    const pickClass = (value: string) => {
        clearError("classWanted");
        clearError("group");
        clearError("previousClass");
        setForm((f) => ({
            ...f,
            classWanted: value,
            group: classHasGroups(value) ? f.group : "",
            previousClass: previousClassOptions(value).includes(f.previousClass) ? f.previousClass : "",
        }));
    };

    async function uploadFile(kind: keyof ApplicationFiles, file: File) {
        setUploadErrors((prev) => ({ ...prev, [kind]: undefined }));
        if (kind === "photoUrl") {
            const problem = await photoProblem(file);
            if (problem) {
                setUploadErrors((prev) => ({ ...prev, [kind]: problem }));
                return;
            }
        }
        setUploading(kind);
        setError(null);
        try {
            const fd = new FormData();
            fd.append("file", file);
            fd.append("kind", APPLICATION_ATTACHMENTS[kind].kind);
            const res = await fetch("/api/admissions/upload", { method: "POST", body: fd, credentials: "include" });
            const data: unknown = await res.json().catch(() => null);
            if (!res.ok) throw new Error(uploadErrorMessage(data));
            const url = data && typeof data === "object" && "url" in data ? String(data.url) : "";
            if (!url) throw new Error("Upload failed");
            setFiles((f) => ({ ...f, [kind]: url }));
        } catch (err) {
            setUploadErrors((prev) => ({ ...prev, [kind]: err instanceof Error ? err.message : "Upload failed" }));
        } finally {
            setUploading(null);
        }
    }

    /** The fields of a step, as the schema for that step sees them. */
    function stepPayload(key: (typeof ADMISSION_STEPS)[number]["key"]) {
        const formKeys = STEP_FIELDS[key as keyof typeof STEP_FIELDS] ?? [];
        const out: Record<string, unknown> = {};
        for (const k of formKeys) out[k] = form[k];
        if (key === "academic") Object.assign(out, files);
        if (key === "review") out.declarationAccepted = form.declarationAccepted;
        return out;
    }

    /** Validate the current step; on success move to the next one. */
    function next() {
        const key = ADMISSION_STEPS[step].key;
        const schema = key === "student" ? studentStepSchema
            : key === "guardian" ? guardianStepSchema
            : key === "academic" ? academicStepSchema
            : reviewStepSchema;
        const result = schema.safeParse(stepPayload(key));
        if (!result.success) {
            setErrors(fieldErrors(result.error));
            return;
        }
        setErrors({});
        setStep((s) => Math.min(s + 1, ADMISSION_STEPS.length - 1));
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function back() {
        setErrors({});
        setStep((s) => Math.max(s - 1, 0));
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    /** The whole application, as the schema sees it. */
    function wholeForm() {
        return {
            ...Object.fromEntries(Object.entries(form).filter(([k]) => k !== "website")),
            ...files,
        };
    }

    async function submit() {
        // Validate the whole application, not just the declaration: a field
        // the applicant edited after its step was passed (the permanent
        // address, say) must still be refused before the POST.
        const result = admissionSchema.safeParse(wholeForm());
        if (!result.success) {
            const fieldErrorsOfForm = fieldErrors(result.error);
            setErrors(fieldErrorsOfForm);
            const first = Object.keys(fieldErrorsOfForm)[0];
            if (first) {
                setStep(stepForField(first));
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
            return;
        }
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
            website: form.website,
            ...files,
        };
        const opt: (keyof ApplicationForm)[] = [
            "studentNameBn", "dateOfBirth", "gender", "birthCertNo", "religion", "nationality", "bloodGroup",
            "fatherName", "fatherNameBn", "fatherProfession", "fatherNid", "fatherPhone",
            "motherName", "motherNameBn", "motherProfession", "motherNid", "motherPhone",
            "guardianRelation", "localGuardianProfession", "guardianNid", "emergencyPhone",
            "presentVillage", "presentRoad", "presentWard", "presentPostOffice", "presentPoliceStation",
            "presentUpazila", "presentDistrict", "presentPostalCode",
            "group", "admissionType", "shift", "previousSchool", "previousClass", "previousResult",
            "tcNumber", "tcDate", "previousSchoolPhone", "quota", "note",
        ];
        for (const k of opt) {
            const v = form[k];
            if (typeof v === "string" && v.trim()) body[k] = v.trim();
            else if (typeof v === "string" && ["religion", "bloodGroup", "group", "quota", "admissionType", "previousClass", "guardianRelation"].includes(k) && v) body[k] = v;
        }
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
            const res = await api<AdmissionReceipt>("/admissions", { method: "POST", body });
            sessionStorage.setItem("admissionReceipt", JSON.stringify(res));
            // The printable form is built from the values the applicant
            // typed, so they travel with the receipt. The success screen
            // can send the applicant back to /admission?print=1 to see and
            // print the full form.
            sessionStorage.setItem("admissionPrintData", JSON.stringify({ form, files }));
            setReceipt(res);
            router.replace("/admission/success");
        } catch (err) {
            setError(err instanceof RequestError ? err.messages.join("; ") : "Submission failed. Please try again.");
        } finally {
            setBusy(false);
        }
    }

    // ─── PRINTABLE APPLICATION SHEET ───
    if (print) {
        const letterhead: ApplicationLetterhead = {
            schoolName: cfg.schoolName,
            schoolNameBn: cfg.schoolNameBn,
            address: cfg.address,
            phone: cfg.phone,
            email: cfg.email,
            eiin: cfg.eiin,
            board: cfg.board,
        };
        return (
            <div className="min-h-screen w-full bg-muted/10 print:bg-white">
                {/* Toolbar — hidden on paper, so the sheet prints alone. */}
                <div className="print:hidden sticky top-0 z-50 w-full border-b border-border/60 bg-white px-6 py-3 shadow-sm">
                    <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
                        <Button onClick={() => window.print()} className="gap-2 font-black text-xs uppercase tracking-wider">
                            <FaPrint size={12} />
                            {tn("Print / Save as PDF", "প্রিন্ট / PDF সংরক্ষণ")}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => window.location.replace("/admission")}
                            className="gap-2 font-black text-xs uppercase tracking-wider"
                        >
                            <FaArrowLeft size={12} /> {tn("New Application", "নতুন আবেদন")}
                        </Button>
                    </div>
                </div>
                <div className="flex justify-center py-6 print:p-0">
                    <AdmissionApplicationSheet
                        form={form}
                        files={files}
                        receipt={receipt}
                        letterhead={letterhead}
                        language={language}
                    />
                </div>
            </div>
        );
    }

    // ─── FORM ───
    const stepKey = ADMISSION_STEPS[step].key;
    const isLast = step === ADMISSION_STEPS.length - 1;

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 bg-muted/30 py-10">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-black text-primary uppercase tracking-tight">{tn("Online Admission", "অনলাইন ভর্তি")}</h1>
                        <p className="text-sm text-muted-foreground mt-2">{tn("Fill out the form below — no account needed. You get an application number after you submit; the result is published in the school notices.", "নিচের ফর্মটি পূরণ করুন — কোনো অ্যাকাউন্ট লাগবে না। জমা দেওয়ার পরে একটি আবেদন নম্বর পাবেন; ফলাফল বিদ্যালয়ের নোটিশে প্রকাশ করা হবে।")}</p>
                    </div>

                    {/* The progress bar. A completed step is clickable, so the
                        applicant can go back to correct something. */}
                    <ol className="flex items-center gap-2 sm:gap-4 mb-6" aria-label={tn("Admission steps", "ভর্তির ধাপ")}>
                        {ADMISSION_STEPS.map((s, i) => {
                            const done = i < step;
                            const current = i === step;
                            return (
                                <li key={s.key} className="flex-1 min-w-0">
                                    <button
                                        type="button"
                                        onClick={() => { if (i < step) { setErrors({}); setStep(i); } }}
                                        disabled={i > step}
                                        aria-current={current ? "step" : undefined}
                                        className={`w-full text-left group ${i > step ? "cursor-default" : "cursor-pointer"}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`flex items-center justify-center size-7 shrink-0 rounded-full text-[11px] font-black transition-colors ${
                                                current ? "bg-primary text-primary-foreground"
                                                    : done ? "bg-emerald-600 text-white"
                                                    : "bg-muted text-muted-foreground"
                                            }`}>
                                                {done ? <FaCircleCheck size={13} /> : i + 1}
                                            </span>
                                            <span className={`hidden sm:block truncate text-[11px] font-black uppercase tracking-wider ${
                                                current ? "text-primary" : done ? "text-foreground/80" : "text-muted-foreground"
                                            }`}>
                                                {language === "bn" ? s.titleBn : s.title}
                                            </span>
                                        </div>
                                        <div className={`h-1 rounded-full mt-2 transition-colors ${done || current ? "bg-primary" : "bg-border"}`} />
                                    </button>
                                </li>
                            );
                        })}
                    </ol>

                    <Card className="border-border/60 shadow-md">
                        <div className="h-1.5 bg-gradient-brand w-full rounded-t-xl" />
                        <CardContent className="p-6 md:p-8 space-y-8">
                            {error ? (
                                <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">{error}</div>
                            ) : null}

                            {/* The spam trap. A human never sees it; a bot that
                                fills every input does, and the server refuses
                                the submission. */}
                            <div className="hidden" aria-hidden="true">
                                <label htmlFor="website">Website</label>
                                <input
                                    id="website"
                                    name="website"
                                    type="text"
                                    tabIndex={-1}
                                    autoComplete="off"
                                    value={form.website}
                                    onChange={(e) => set("website", e.target.value)}
                                />
                            </div>

                            {stepKey === "student" ? (
                                <Section title={tn("Student Information", "শিক্ষার্থীর তথ্য")}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Field label={`${tn("Student Name (English)", "নাম (ইংরেজি)")} *`} error={errors.studentName}>
                                            <Input className="h-11" value={form.studentName} onChange={(e) => set("studentName", e.target.value)} />
                                        </Field>
                                        <Field label={tn("Student Name (Bangla)", "নাম (বাংলা)")}>
                                            <Input className="h-11" value={form.studentNameBn} onChange={(e) => set("studentNameBn", e.target.value)} />
                                        </Field>
                                        <Field label={tn("Date of Birth", "জন্মতারিখ")} error={errors.dateOfBirth}>
                                            <Input className="h-11" type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
                                        </Field>
                                        <Field label={tn("Age", "বয়স")}>
                                            <Input
                                                className="h-11 bg-muted/40"
                                                type="text"
                                                readOnly
                                                value={derivedAge === null ? "" : String(derivedAge)}
                                                placeholder={tn("Calculated from the date of birth", "জন্মতারিখ থেকে হিসাব করা হয়")}
                                            />
                                        </Field>
                                        <Field label={tn("Gender", "লিঙ্গ")} error={errors.gender}>
                                            <div className="flex gap-2">
                                                {GENDERS.map((g) => (
                                                    <Toggle key={g} value={g} current={form.gender} onPick={(v) => set("gender", v)}
                                                        label={tn(g, GENDER_BN[g] ?? g)} />
                                                ))}
                                            </div>
                                        </Field>
                                        <Field label={tn("Birth Cert. No.", "জন্মনিবন্ধন নং")}>
                                            <Input className="h-11" value={form.birthCertNo} onChange={(e) => set("birthCertNo", e.target.value)} />
                                        </Field>
                                        <Field label={tn("Religion", "ধর্ম")} error={errors.religion}>
                                            <Select value={form.religion || undefined} onValueChange={(v) => set("religion", v)} label="Religion">
                                                <SelectTrigger className="h-11"><SelectValue placeholder="Select religion" /></SelectTrigger>
                                                <SelectContent searchable>{RELIGIONS.map((r) => <SelectItem key={r} value={r}>{tn(r, RELIGION_BN[r])}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </Field>
                                        <Field label={tn("Nationality", "জাতীয়তা")}>
                                            <Input className="h-11" value={form.nationality} onChange={(e) => set("nationality", e.target.value)} />
                                        </Field>
                                        <Field label={tn("Blood Group", "রক্তের গ্রুপ")} error={errors.bloodGroup}>
                                            <Select value={form.bloodGroup || undefined} onValueChange={(v) => set("bloodGroup", v)} label="Blood group">
                                                <SelectTrigger className="h-11"><SelectValue placeholder="Select blood group" /></SelectTrigger>
                                                <SelectContent searchable>{BLOOD_GROUPS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </Field>
                                    </div>
                                </Section>
                            ) : null}

                            {stepKey === "guardian" ? (
                                <div className="space-y-8">
                                    <Section title={tn("Parent Information", "অভিভাবকের তথ্য")}>
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

                                    <Section title={tn("Guardian & Contact", "অভিভাবক ও যোগাযোগ")}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Field label={`${tn("Guardian Name", "অভিভাবকের নাম")} *`} error={errors.guardianName}>
                                                <Input className="h-11" value={form.guardianName} onChange={(e) => set("guardianName", e.target.value)} />
                                            </Field>
                                            <Field label={tn("Relation", "সম্পর্ক")} error={errors.guardianRelation}>
                                                <div className="flex gap-2">
                                                    {RELATIONS.map((r) => (
                                                        <Toggle key={r} value={r} current={form.guardianRelation} onPick={(v) => set("guardianRelation", v)}
                                                            label={tn(r, RELATION_BN[r] ?? r)} />
                                                    ))}
                                                </div>
                                            </Field>
                                            <Field label={tn("Guardian Profession", "অভিভাবকের পেশা")}><Input className="h-11" value={form.localGuardianProfession} onChange={(e) => set("localGuardianProfession", e.target.value)} /></Field>
                                            <Field label={tn("Guardian NID / BRN", "অভিভাবকের আইডি")}><Input className="h-11" value={form.guardianNid} onChange={(e) => set("guardianNid", e.target.value)} /></Field>
                                            <Field label={`${tn("Phone", "ফোন")} *`} error={errors.phone}>
                                                <Input className="h-11" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="017XXXXXXXX" />
                                            </Field>
                                            <Field label={tn("Emergency Phone", "জরুরি মোবাইল")}>
                                                <Input className="h-11" value={form.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} placeholder="017XXXXXXXX" />
                                            </Field>
                                            <Field label={`${tn("Email", "ইমেইল")} *`} span2 error={errors.email}>
                                                <Input className="h-11" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
                                            </Field>
                                        </div>
                                    </Section>

                                    <Section title={tn("Present Address", "বর্তমান ঠিকানা")}>
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

                                    <Section title={tn("Permanent Address", "স্থায়ী ঠিকানা")}>
                                        <label className="flex items-center gap-2.5 mb-4 cursor-pointer">
                                            <Checkbox checked={form.permanentSameAsPresent} onCheckedChange={(v) => setBoolean("permanentSameAsPresent", v === true)} />
                                            <span className="text-xs font-semibold">{tn("Same as present address", "বর্তমান ঠিকানার মতোই")}</span>
                                        </label>
                                        {!form.permanentSameAsPresent ? (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <Field label={tn("Village / House", "গ্রাম / বাড়ি")} error={errors.permanentVillage}>
                                                    <Input className="h-11" value={form.permanentVillage} onChange={(e) => set("permanentVillage", e.target.value)} />
                                                </Field>
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
                                </div>
                            ) : null}

                            {stepKey === "academic" ? (
                                <div className="space-y-8">
                                    <Section title={tn("Academic & Admission", "একাডেমিক ও ভর্তি")}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Field label={`${tn("Class Applied for", "যে শ্রেণিতে আবেদন")} *`} error={errors.classWanted} span2>
                                                <div className="grid grid-cols-5 gap-2">
                                                    {CLASSES.map((c) => <Toggle key={c} value={c} current={form.classWanted} onPick={pickClass} label={c.replace("Class ", "")} />)}
                                                </div>
                                            </Field>
                                            {classHasGroups(form.classWanted) ? (
                                                <Field label={tn("Group", "বিভাগ")} error={errors.group}>
                                                    <Select value={form.group || undefined} onValueChange={(v) => set("group", v)} label="Group">
                                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select group" /></SelectTrigger>
                                                        <SelectContent searchable>{GROUPS.map((g) => <SelectItem key={g} value={g}>{tn(g, GROUP_BN[g])}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                </Field>
                                            ) : null}
                                            <Field label={tn("Admission Type", "ভর্তির ধরন")} error={errors.admissionType}>
                                                <Select value={form.admissionType || undefined} onValueChange={(v) => set("admissionType", v)} label="Admission type">
                                                    <SelectTrigger className="h-11"><SelectValue placeholder="Select type" /></SelectTrigger>
                                                    <SelectContent>{cfg.admissionTypes.map((a) => <SelectItem key={a} value={a}>{tn(a, ADMISSION_TYPE_BN[a] ?? a)}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </Field>
                                            {cfg.shifts.length > 0 ? (
                                                <Field label={tn("Shift", "শিফট")} error={errors.shift}>
                                                    <Select value={form.shift || undefined} onValueChange={(v) => set("shift", v)} label="Shift">
                                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select shift" /></SelectTrigger>
                                                        <SelectContent>{cfg.shifts.map((shiftName) => <SelectItem key={shiftName} value={shiftName}>{shiftName}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                </Field>
                                            ) : null}
                                            <Field label={tn("Previous School", "পূর্ববর্তী বিদ্যালয়")}><Input className="h-11" value={form.previousSchool} onChange={(e) => set("previousSchool", e.target.value)} /></Field>
                                            <Field label={tn("Previous Class", "পূর্বের শ্রেণি")} error={errors.previousClass}>
                                                <Select value={form.previousClass || undefined} onValueChange={(v) => set("previousClass", v)} label="Previous class"
                                                    disabled={!form.classWanted}>
                                                    <SelectTrigger className="h-11"><SelectValue placeholder={form.classWanted ? "Select previous class" : "Choose the class first"} /></SelectTrigger>
                                                    <SelectContent searchable>{previousClassOptions(form.classWanted).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </Field>
                                            <Field label={tn("Previous Result / GPA", "পূর্ববর্তী ফলাফল / জিপিএ")}><Input className="h-11" value={form.previousResult} onChange={(e) => set("previousResult", e.target.value)} placeholder="5.00 / Division" /></Field>
                                            <Field label={tn("Previous School Phone", "পূর্বের বিদ্যালয়ের ফোন")}><Input className="h-11" value={form.previousSchoolPhone} onChange={(e) => set("previousSchoolPhone", e.target.value)} /></Field>
                                            <Field label={tn("TC Number", "টিসি নং")}><Input className="h-11" value={form.tcNumber} onChange={(e) => set("tcNumber", e.target.value)} /></Field>
                                            <Field label={tn("TC Date", "টিসি তারিখ")} error={errors.tcDate}>
                                                <Input className="h-11" type="date" value={form.tcDate} onChange={(e) => set("tcDate", e.target.value)} />
                                            </Field>
                                            <Field label={tn("Quota", "কোটা")} error={errors.quota}>
                                                <Select value={form.quota} onValueChange={(v) => set("quota", v)} label="Quota">
                                                    <SelectTrigger className="h-11"><SelectValue placeholder="General" /></SelectTrigger>
                                                    <SelectContent searchable>{QUOTAS.map((q) => <SelectItem key={q} value={q}>{tn(q, QUOTA_BN[q])}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </Field>
                                        </div>
                                    </Section>

                                    <Section title={tn("Attachments", "সংযুক্তি")}>
                                        <p className="text-[11px] text-muted-foreground mb-4">{tn("Photo, birth certificate, and testimonial (optional but recommended).", "ছবি, জন্মনিবন্ধন ও প্রশংসাপত্র (ঐচ্ছিক কিন্তু আমরূপ)।")}</p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {(Object.keys(APPLICATION_ATTACHMENTS) as (keyof ApplicationFiles)[]).map((kind) => {
                                                const meta = APPLICATION_ATTACHMENTS[kind];
                                                const url = files[kind];
                                                return (
                                                    <div key={kind} className="space-y-1.5">
                                                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                            {ATTACHMENT_ICONS[kind]({ size: 10 })}
                                                            {meta.label}
                                                        </Label>
                                                        {meta.hint ? <p className="text-[10px] text-muted-foreground">{meta.hint}</p> : null}
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
                                                        {uploadErrors[kind] ? (
                                                            <p className="text-[10px] font-semibold text-destructive">{uploadErrors[kind]}</p>
                                                        ) : null}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </Section>

                                    <Field label={tn("Additional Note", "অতিরিক্ত মন্তব্য")} error={errors.note}>
                                        <Textarea className="rounded-md" rows={2} value={form.note} onChange={(e) => set("note", e.target.value)} />
                                    </Field>
                                </div>
                            ) : null}

                            {stepKey === "review" ? (
                                <div className="space-y-6">
                                    <Section title={tn("Review Your Application", "আপনার আবেদন পর্যালোচনা করুন")}>
                                        <p className="text-[11px] text-muted-foreground mb-4">{tn("Check the details below. Use Edit to go back to a step and change something.", "নিচের তথ্য যাচাই করুন। কিছু পরিবর্তন করতে সংশ্লিষ্ট ধাপে ফিরে যান।")}</p>
                                        <div className="space-y-4">
                                            <ReviewGroup
                                                title={tn("Student Information", "শিক্ষার্থীর তথ্য")}
                                                onEdit={() => { setErrors({}); setStep(0); }}
                                                rows={[
                                                    [tn("Name (EN)", "নাম (ইংরেজি)"), form.studentName],
                                                    [tn("Name (BN)", "নাম (বাংলা)"), form.studentNameBn],
                                                    [tn("Date of Birth", "জন্মতারিখ"), form.dateOfBirth],
                                                    [tn("Age", "বয়স"), derivedAge === null ? "—" : String(derivedAge)],
                                                    [tn("Gender", "লিঙ্গ"), form.gender ? tn(form.gender, GENDER_BN[form.gender] ?? form.gender) : ""],
                                                    [tn("Birth Cert. No.", "জন্মনিবন্ধন নং"), form.birthCertNo],
                                                    [tn("Religion", "ধর্ম"), form.religion ? tn(form.religion, RELIGION_BN[form.religion] ?? form.religion) : ""],
                                                    [tn("Nationality", "জাতীয়তা"), form.nationality],
                                                    [tn("Blood Group", "রক্তের গ্রুপ"), form.bloodGroup],
                                                ]}
                                            />
                                            <ReviewGroup
                                                title={tn("Guardian & Contact", "অভিভাবক ও যোগাযোগ")}
                                                onEdit={() => { setErrors({}); setStep(1); }}
                                                rows={[
                                                    [tn("Father", "পিতা"), form.fatherName],
                                                    [tn("Mother", "মাতা"), form.motherName],
                                                    [tn("Guardian", "অভিভাবক"), form.guardianName],
                                                    [tn("Relation", "সম্পর্ক"), form.guardianRelation ? tn(form.guardianRelation, RELATION_BN[form.guardianRelation] ?? form.guardianRelation) : ""],
                                                    [tn("Phone", "ফোন"), form.phone],
                                                    [tn("Email", "ইমেইল"), form.email],
                                                    [tn("Present Address", "বর্তমান ঠিকানা"), [
                                                        form.presentVillage, form.presentRoad, form.presentWard, form.presentPostOffice,
                                                        form.presentPoliceStation, form.presentUpazila, form.presentDistrict, form.presentPostalCode,
                                                    ].filter(Boolean).join(", ")],
                                                    [tn("Permanent Address", "স্থায়ী ঠিকানা"), form.permanentSameAsPresent
                                                        ? tn("Same as present address", "বর্তমান ঠিকানার মতোই")
                                                        : [form.permanentVillage, form.permanentDistrict].filter(Boolean).join(", ")],
                                                ]}
                                            />
                                            <ReviewGroup
                                                title={tn("Academic Choice", "একাডেমিক পছন্দ")}
                                                onEdit={() => { setErrors({}); setStep(2); }}
                                                rows={[
                                                    [tn("Class Applied for", "যে শ্রেণিতে আবেদন"), form.classWanted],
                                                    [tn("Group", "বিভাগ"), form.group ? tn(form.group, GROUP_BN[form.group] ?? form.group) : ""],
                                                    [tn("Admission Type", "ভর্তির ধরন"), form.admissionType ? tn(form.admissionType, ADMISSION_TYPE_BN[form.admissionType] ?? form.admissionType) : ""],
                                                    [tn("Shift", "শিফট"), form.shift],
                                                    [tn("Previous School", "পূর্ববর্তী বিদ্যালয়"), form.previousSchool],
                                                    [tn("TC No.", "টিসি নং"), form.tcNumber],
                                                    [tn("Quota", "কোটা"), form.quota && form.quota !== "general" ? tn(form.quota, QUOTA_BN[form.quota] ?? form.quota) : tn("General", "সাধারণ")],
                                                ]}
                                            />
                                        </div>

                                        {(files.photoUrl || files.birthCertUrl || files.testimonialUrl) ? (
                                            <div className="mt-4 rounded-xl border border-border/70">
                                                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-muted/40 border-b border-border/70">
                                                    <p className="text-[10px] font-black text-foreground uppercase tracking-wider">{tn("Attachments", "সংযুক্তি")}</p>
                                                    <button type="button" onClick={() => { setErrors({}); setStep(2); }}
                                                        className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-primary hover:opacity-75 cursor-pointer">
                                                        <FaPen size={10} /> {tn("Edit", "সম্পাদনা")}
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4">
                                                    {(Object.keys(APPLICATION_ATTACHMENTS) as (keyof ApplicationFiles)[]).map((kind) => {
                                                        const url = files[kind];
                                                        if (!url) return null;
                                                        const meta = APPLICATION_ATTACHMENTS[kind];
                                                        return (
                                                            <div key={kind} className="space-y-1.5">
                                                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{meta.label}</p>
                                                                {kind === "photoUrl" ? (
                                                                    // eslint-disable-next-line @next/next/no-img-element
                                                                    <img src={url} alt={meta.label} className="size-24 object-cover rounded-lg border border-border/60" />
                                                                ) : (
                                                                    <a href={url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">{tn("View file", "ফাইল দেখুন")}</a>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : null}
                                    </Section>

                                    <label className="flex items-start gap-2.5 cursor-pointer">
                                        <span className="mt-0.5"><Checkbox checked={form.declarationAccepted} onCheckedChange={(v) => setBoolean("declarationAccepted", v === true)} /></span>
                                        <span className="text-xs text-muted-foreground leading-relaxed">
                                            {tn("I declare that the information provided is true and agree to abide by all rules and regulations of the institution.",
                                                "আমি ঘোষণা করছি যে প্রদত্ত তথ্য সত্য এবং প্রতিষ্ঠানের সকল নিয়ম-কানুন মেনে চলতে প্রতিশ্রুতিবদ্ধ।")}
                                        </span>
                                    </label>
                                    {errors.declarationAccepted ? (
                                        <p className="text-[11px] font-semibold text-destructive -mt-4">{errors.declarationAccepted}</p>
                                    ) : !form.declarationAccepted ? (
                                        <p className="text-[11px] text-muted-foreground -mt-4">{tn("Please accept the declaration to submit.", "জমা দিতে ঘোষণাটি গ্রহণ করুন।")}</p>
                                    ) : null}
                                </div>
                            ) : null}

                            {/* The step controls. */}
                            <div className="flex items-center gap-3 pt-2 border-t border-border/60">
                                {step > 0 ? (
                                    <Button type="button" variant="outline" onClick={back}
                                        className="h-12 px-6 font-black text-xs uppercase tracking-wider">
                                        <FaArrowLeft size={13} /> {tn("Back", "পেছনে")}
                                    </Button>
                                ) : null}
                                {isLast ? (
                                    <Button type="button" onClick={submit} disabled={busy}
                                        className="flex-1 h-12 font-black text-sm uppercase tracking-wider bg-emerald-700 hover:bg-emerald-800">
                                        {busy
                                            ? <><FaSpinner className="animate-spin" size={13} /> {tn("Submitting…", "জমা হচ্ছে…")}</>
                                            : <><FaPrint size={14} /> {tn("Submit Application", "আবেদন জমা দিন")}</>}
                                    </Button>
                                ) : (
                                    <Button type="button" onClick={next}
                                        className="flex-1 h-12 font-black text-sm uppercase tracking-wider bg-emerald-700 hover:bg-emerald-800">
                                        {tn("Next", "পরবর্তী")} <FaArrowRight size={14} />
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

/**
 * A labelled form field. The label is wired to the input with a generated
 * id, so clicking the label focuses the input.
 *
 * These three live at module scope on purpose: defined inside the page
 * component, every render produced a new component identity, so React
 * unmounted and remounted the whole form on every keystroke and typing
 * lost focus after each character.
 */
function Field({
    label,
    children,
    span2,
    error,
}: {
    label: string;
    children: React.ReactNode;
    span2?: boolean;
    error?: string;
}) {
    const id = React.useId();
    const child = React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, { id })
        : children;
    return (
        <div className={`space-y-1.5 ${span2 ? "md:col-span-2" : ""}`}>
            <Label htmlFor={id} className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{label}</Label>
            {child}
            {error ? <p className="text-[11px] font-semibold text-destructive">{error}</p> : null}
        </div>
    );
}

/** A titled group of fields within a step. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section>
            <p className="text-[10px] font-black text-primary uppercase tracking-wider mb-4">{title}</p>
            {children}
        </section>
    );
}

/** One of a set of exclusive choices (gender, religion, …). */
function Toggle({
    value,
    current,
    onPick,
    label,
}: {
    value: string;
    current: string;
    onPick: (v: string) => void;
    label: string;
}) {
    return (
        <button type="button" onClick={() => onPick(value)}
            className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${current === value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
            {label}
        </button>
    );
}

/** One group's worth of the review, with an Edit control back to its step. */
function ReviewGroup({
    title,
    onEdit,
    rows,
}: {
    title: string;
    onEdit: () => void;
    rows: [string, string][];
}) {
    const shown = rows.filter(([, v]) => v.trim() !== "");
    return (
        <div className="rounded-xl border border-border/70">
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-muted/40 border-b border-border/70">
                <p className="text-[10px] font-black text-foreground uppercase tracking-wider">{title}</p>
                <button type="button" onClick={onEdit}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-primary hover:opacity-75 cursor-pointer">
                    <FaPen size={10} /> Edit
                </button>
            </div>
            <dl className="divide-y divide-border/40">
                {shown.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-muted-foreground">—</div>
                ) : shown.map(([k, v]) => (
                    <div key={k} className="grid grid-cols-3 gap-3 px-4 py-2.5">
                        <dt className="text-[11px] font-semibold text-muted-foreground">{k}</dt>
                        <dd className="col-span-2 text-xs font-semibold text-foreground break-words">{v}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}
