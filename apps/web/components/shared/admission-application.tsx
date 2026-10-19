"use client";

// components/shared/admission-application.tsx — the printable admission
// application: the form the applicant signs and submits with the school.
//
// One canonical rendering, shared by the print route (/admission?print=1)
// and the print preview. The sheet is a document, not a UI: it has no
// buttons and no navigation, so what comes out of the printer is the
// application and nothing else.
//
// The layout is sized against an A4 sheet (210 × 297mm) and uses `print:`
// variants so the screen preview and the paper agree. The fields are laid
// out as a dense label-over-value grid, the way a paper form is filled in
// by hand — four columns for the wide sections, two for the address
// halves. Everything is black on white.

import { cn } from "@/lib/utils";
import { ageFromDateOfBirth } from "@/lib/age";
import {
    APPLICATION_ATTACHMENTS,
    ATTACHMENT_KEYS,
    ADMISSION_TYPE_BN,
    GENDER_BN,
    GROUP_BN,
    QUOTA_BN,
    RELATION_BN,
    RELIGION_BN,
    applicationNumber,
    permanentAddress,
    presentAddress,
    type AdmissionReceipt,
    type ApplicationFiles,
    type ApplicationForm,
} from "@/lib/admission-application";

export interface ApplicationLetterhead {
    schoolName: string;
    schoolNameBn: string;
    address: string;
    phone: string;
    email: string;
    eiin: string;
    board: string;
}

/**
 * Print the application sheet, once everything it needs is on screen.
 *
 * The dialog opens as soon as React paints, and two things can still be
 * missing by then: the web font (the sheet would lay out in a fallback
 * face) and the student photo (still in flight, so the printed form would
 * lose it). Both callers — the print route and the success page — wait for
 * the same two things.
 */
export async function printApplicationSheet(): Promise<void> {
    await document.fonts.ready;
    await Promise.all(
        Array.from(document.images).map((img) => img.decode().catch(() => undefined)),
    );
    window.print();
}

/** One row of the sheet: a label and the value the applicant gave. */
interface SheetRow {
    label: string;
    value: string;
}

/**
 * The printable application.
 *
 * `receipt` may be null — the sheet then prints without an application
 * number, which is what a draft looks like.
 */
export function AdmissionApplicationSheet({
    form,
    files,
    receipt,
    letterhead,
    language = "en",
    className,
}: {
    form: ApplicationForm;
    files: ApplicationFiles;
    receipt: AdmissionReceipt | null;
    letterhead: ApplicationLetterhead;
    language?: "en" | "bn";
    className?: string;
}) {
    const t = (en: string, bn: string) => (language === "bn" ? bn : en);
    const dash = "—";
    const or = (value: string, fallback = dash) => (value.trim() ? value.trim() : fallback);

    const age = ageFromDateOfBirth(form.dateOfBirth);
    const appNo = applicationNumber(receipt);

    const student: SheetRow[] = [
        { label: t("Student Name (English)", "নাম (ইংরেজি)"), value: or(form.studentName) },
        { label: t("Student Name (Bangla)", "নাম (বাংলা)"), value: or(form.studentNameBn) },
        { label: t("Date of Birth", "জন্মতারিখ"), value: or(form.dateOfBirth) },
        { label: t("Age", "বয়স"), value: age === null ? dash : String(age) },
        { label: t("Gender", "লিঙ্গ"), value: form.gender ? t(form.gender, GENDER_BN[form.gender] ?? form.gender) : dash },
        { label: t("Birth Cert. No.", "জন্মনিবন্ধন নং"), value: or(form.birthCertNo) },
        { label: t("Religion", "ধর্ম"), value: form.religion ? t(form.religion, RELIGION_BN[form.religion] ?? form.religion) : dash },
        { label: t("Nationality", "জাতীয়তা"), value: or(form.nationality) },
        { label: t("Blood Group", "রক্তের গ্রুপ"), value: or(form.bloodGroup) },
    ];

    const family: SheetRow[] = [
        { label: t("Father's Name", "পিতার নাম"), value: or(form.fatherName) },
        { label: t("Father's Name (Bangla)", "পিতার নাম (বাংলা)"), value: or(form.fatherNameBn) },
        { label: t("Father's Profession", "পিতার পেশা"), value: or(form.fatherProfession) },
        { label: t("Father's NID / Passport", "পিতার আইডি নং"), value: or(form.fatherNid) },
        { label: t("Father's Mobile", "পিতার মোবাইল"), value: or(form.fatherPhone) },
        { label: t("Mother's Name", "মাতার নাম"), value: or(form.motherName) },
        { label: t("Mother's Name (Bangla)", "মাতার নাম (বাংলা)"), value: or(form.motherNameBn) },
        { label: t("Mother's Profession", "মাতার পেশা"), value: or(form.motherProfession) },
        { label: t("Mother's NID / Passport", "মাতার আইডি নং"), value: or(form.motherNid) },
        { label: t("Mother's Mobile", "মাতার মোবাইল"), value: or(form.motherPhone) },
    ];

    const contact: SheetRow[] = [
        { label: t("Guardian's Name", "অভিভাবকের নাম"), value: or(form.guardianName) },
        { label: t("Relation", "সম্পর্ক"), value: form.guardianRelation ? t(form.guardianRelation, RELATION_BN[form.guardianRelation] ?? form.guardianRelation) : dash },
        { label: t("Guardian's Profession", "অভিভাবকের পেশা"), value: or(form.localGuardianProfession) },
        { label: t("Guardian's NID / BRN", "অভিভাবকের আইডি"), value: or(form.guardianNid) },
        { label: t("Phone", "ফোন"), value: or(form.phone) },
        { label: t("Emergency Phone", "জরুরি মোবাইল"), value: or(form.emergencyPhone) },
        { label: t("Email", "ইমেইল"), value: or(form.email) },
    ];

    const present: SheetRow[] = [
        { label: t("Village / House", "গ্রাম / বাড়ি"), value: or(form.presentVillage) },
        { label: t("Road No.", "রোড নং"), value: or(form.presentRoad) },
        { label: t("Ward / Section", "ওয়ার্ড / সেকশন"), value: or(form.presentWard) },
        { label: t("Post Office", "ডাকঘর"), value: or(form.presentPostOffice) },
        { label: t("Police Station", "থানা"), value: or(form.presentPoliceStation) },
        { label: t("Upazila", "উপজেলা"), value: or(form.presentUpazila) },
        { label: t("District", "জেলা"), value: or(form.presentDistrict) },
        { label: t("Postal Code", "পোস্টাল কোড"), value: or(form.presentPostalCode) },
    ];

    // When the applicant ticked "same as present", the permanent column
    // carries the present values: a signed paper form must show the
    // address, not just a cross-reference to another column.
    const permanent: SheetRow[] = form.permanentSameAsPresent
        ? present
        : [
            { label: t("Village / House", "গ্রাম / বাড়ি"), value: or(form.permanentVillage) },
            { label: t("Road No.", "রোড নং"), value: or(form.permanentRoad) },
            { label: t("Ward / Section", "ওয়ার্ড / সেকশন"), value: or(form.permanentWard) },
            { label: t("Post Office", "ডাকঘর"), value: or(form.permanentPostOffice) },
            { label: t("Police Station", "থানা"), value: or(form.permanentPoliceStation) },
            { label: t("Upazila", "উপজেলা"), value: or(form.permanentUpazila) },
            { label: t("District", "জেলা"), value: or(form.permanentDistrict) },
            { label: t("Postal Code", "পোস্টাল কোড"), value: or(form.permanentPostalCode) },
        ];

    const academic: SheetRow[] = [
        { label: t("Class Applied for", "যে শ্রেণিতে আবেদন"), value: or(form.classWanted) },
        { label: t("Group", "বিভাগ"), value: form.group ? t(form.group, GROUP_BN[form.group] ?? form.group) : dash },
        { label: t("Admission Type", "ভর্তির ধরন"), value: form.admissionType ? t(form.admissionType, ADMISSION_TYPE_BN[form.admissionType] ?? form.admissionType) : dash },
        { label: t("Shift", "শিফট"), value: or(form.shift) },
        { label: t("Previous School", "পূর্ববর্তী বিদ্যালয়"), value: or(form.previousSchool) },
        { label: t("Previous Class", "পূর্বের শ্রেণি"), value: or(form.previousClass) },
        { label: t("Previous Result / GPA", "পূর্ববর্তী ফলাফল / জিপিএ"), value: or(form.previousResult) },
        { label: t("Previous School Phone", "পূর্বের বিদ্যালয়ের ফোন"), value: or(form.previousSchoolPhone) },
        { label: t("TC Number", "টিসি নং"), value: or(form.tcNumber) },
        { label: t("TC Date", "টিসি তারিখ"), value: or(form.tcDate) },
        {
            label: t("Quota", "কোটা"),
            value: form.quota && form.quota !== "general" ? t(form.quota, QUOTA_BN[form.quota] ?? form.quota) : t("General", "সাধারণ"),
        },
    ];

    // The photo is printed in the letterhead, so its row says where it went
    // rather than claiming it is merely filed. Without this the form would
    // tell the school "No file attached" while a photo sits above it.
    const attachments = ATTACHMENT_KEYS
        .map((key) => ({ key, url: files[key] ?? receipt?.[key] }))
        .filter((a) => Boolean(a.url));

    return (
        <div
            className={cn(
                "mx-auto bg-white text-black",
                // A4 sheet. On screen it is a white page with a shadow; in print
                // it becomes the page itself. The margin lives on the sheet, not
                // on @page: a print dialog set to "Margins: None" overrides the
                // page margin and would push the form to the paper edge, but it
                // cannot take away an element's own padding. The named page
                // drops @page's 12mm so the two do not add up to 24mm.
                "w-[210mm] min-h-[297mm] p-[16mm] shadow-lg print:w-full print:min-h-0 print:p-[12mm] print:shadow-none print:[page:admission-sheet]",
                className,
            )}
        >
            <SheetLetterhead
                letterhead={letterhead}
                applicationNo={appNo}
                photoUrl={files.photoUrl ?? receipt?.photoUrl}
            />

            <SheetSection title={t("Student Information", "শিক্ষার্থীর তথ্য")} rows={student} />
            <SheetSection title={t("Parent Information", "অভিভাবকের তথ্য")} rows={family} />
            <SheetSection title={t("Guardian & Contact", "অভিভাবক ও যোগাযোগ")} rows={contact} />

            <div className="mt-3 grid grid-cols-2 gap-4 print:mt-2">
                <SheetAddress title={t("Present Address", "বর্তমান ঠিকানা")} rows={present} summary={presentAddress(form)} />
                <SheetAddress
                    title={t("Permanent Address", "স্থায়ী ঠিকানা")}
                    rows={permanent}
                    summary={permanentAddress(form)}
                    note={form.permanentSameAsPresent ? t("Same as present address", "বর্তমান ঠিকানার মতোই") : null}
                />
            </div>

            <SheetSection title={t("Academic & Admission", "একাডেমিক ও ভর্তি")} rows={academic} />

            {/* The attachments and the applicant's note sit side by side:
                both are short, and the page has to hold everything. */}
            <div className="mt-3 grid grid-cols-2 gap-4 print:mt-2">
                <section>
                    <h2 className="mb-1.5 border-b-2 border-black pb-1 text-[12px] font-black uppercase tracking-wider">
                        {t("Attachments", "সংযুক্তি")}
                    </h2>
                    {attachments.length === 0 ? (
                        <p className="text-[10px] text-black/60">{t("No file attached.", "কোনো ফাইল সংযুক্ত নেই।")}</p>
                    ) : (
                        <ul className="space-y-0.5">
                            {attachments.map((a) => (
                                <li key={a.key} className="flex items-baseline gap-2 text-[10.5px]">
                                    <span className="font-bold">
                                        {t(APPLICATION_ATTACHMENTS[a.key].label, APPLICATION_ATTACHMENTS[a.key].labelBn)}
                                    </span>
                                    <span className="flex-1 border-b border-dotted border-black/40" />
                                    <span className="font-semibold">
                                        {a.key === "photoUrl"
                                            ? t("Printed above", "উপরে ছাপা")
                                            : t("Attached", "সংযুক্ত")}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section>
                    <h2 className="mb-1.5 border-b-2 border-black pb-1 text-[12px] font-black uppercase tracking-wider">
                        {t("Additional Note", "অতিরিক্ত মন্তব্য")}
                    </h2>
                    <p className="text-[10.5px] leading-snug">
                        {form.note.trim() ? form.note.trim() : "—"}
                    </p>
                </section>
            </div>

            <section className="mt-3 break-inside-avoid print:mt-2">
                <h2 className="mb-1.5 border-b-2 border-black pb-1 text-[12px] font-black uppercase tracking-wider">
                    {t("Declaration", "ঘোষণা")}
                </h2>
                <p className="text-[10.5px] leading-relaxed">
                    {t(
                        "I declare that the information provided is true and agree to abide by all rules and regulations of the institution.",
                        "আমি ঘোষণা করছি যে প্রদত্ত তথ্য সত্য এবং প্রতিষ্ঠানের সকল নিয়ম-কানুন মেনে চলতে প্রতিশ্রুতিবদ্ধ।",
                    )}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-8 text-[10px] print:mt-2">
                    <div>
                        <div className="h-7 border-b border-black" />
                        <p className="mt-1 font-bold">{t("Applicant's Signature", "আবেদনকারীর স্বাক্ষর")}</p>
                    </div>
                    <div>
                        <div className="h-7 border-b border-black" />
                        <p className="mt-1 font-bold">{t("Date", "তারিখ")}</p>
                    </div>
                </div>
            </section>

            <footer className="mt-3 border-t border-black/30 pt-2 text-center text-[8.5px] leading-relaxed text-black/60 print:mt-2">
                <p>
                    {letterhead.schoolName} · EIIN {letterhead.eiin} · {letterhead.board}
                </p>
                <p className="mt-0.5">
                    {t(
                        "Keep the application number. The admission result will be published in the school notices.",
                        "আবেদন নম্বরটি সংরক্ষণ করুন। ভর্তির ফলাফল বিদ্যালয়ের নোটিশে প্রকাশ করা হবে।",
                    )}
                </p>
            </footer>
        </div>
    );
}

/** School identity block at the top of the sheet. */
function SheetLetterhead({
    letterhead,
    applicationNo,
    photoUrl,
}: {
    letterhead: ApplicationLetterhead;
    applicationNo: string;
    /** The student photo, printed in a box at the top right of the form. */
    photoUrl?: string;
}) {
    return (
        <header className="border-b-2 border-black pb-3">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-[18px] font-black uppercase leading-tight tracking-tight">
                        {letterhead.schoolName}
                    </h1>
                    <p className="text-[12px] font-semibold leading-tight">{letterhead.schoolNameBn}</p>
                    <p className="mt-0.5 text-[9px] leading-snug text-black/70">
                        {letterhead.address} · {letterhead.phone} · {letterhead.email}
                    </p>
                    <p className="text-[9px] leading-snug text-black/70">
                        EIIN {letterhead.eiin} · {letterhead.board}
                    </p>
                </div>
                <div className="shrink-0 text-right">
                    <p className="text-[14px] font-black uppercase tracking-wider">Admission Application</p>
                    <p className="text-[10px] font-bold">Form</p>
                    {applicationNo ? (
                        <p className="mt-0.5 text-[12px] font-black">
                            No. <span className="font-mono">{applicationNo}</span>
                        </p>
                    ) : null}
                </div>
                {/* The photo is part of the form, not decoration: the school
                    keeps it with the application. The box always prints so the
                    same space is left for it on a draft without a photo. */}
                <div className="shrink-0 text-center">
                    <div className="size-[26mm] border border-black bg-white">
                        {photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={photoUrl}
                                alt="Student photo"
                                className="size-full object-cover print:block"
                            />
                        ) : null}
                    </div>
                    <p className="mt-0.5 text-[7.5px] font-bold uppercase tracking-wide text-black/60">
                        Student Photo
                    </p>
                </div>
            </div>
        </header>
    );
}

/** A titled group of label/value rows. */
function SheetSection({ title, rows }: { title: string; rows: SheetRow[] }) {
    return (
        <section className="mt-3 print:mt-2">
            <h2 className="mb-1.5 border-b-2 border-black pb-1 text-[12px] font-black uppercase tracking-wider">{title}</h2>
            <SheetGrid rows={rows} />
        </section>
    );
}

/** A titled group of label/value rows, for one half of the page. */
function SheetAddress({
    title,
    rows,
    summary,
    note,
}: {
    title: string;
    rows: SheetRow[];
    summary: string;
    /** A short line under the address, e.g. "same as present address". */
    note?: string | null;
}) {
    return (
        <section className="break-inside-avoid">
            <h2 className="mb-1.5 border-b-2 border-black pb-1 text-[12px] font-black uppercase tracking-wider">{title}</h2>
            <SheetGrid rows={rows} />
            <p className="mt-1 text-[9.5px] leading-snug text-black/70">
                {summary.trim() ? summary.trim() : "—"}
                {note ? <span className="ml-1 font-bold italic">({note})</span> : null}
            </p>
        </section>
    );
}

/**
 * The bordered label/value grid the rows are laid out in: the label sits
 * above the value, the way a paper form is filled in by hand.
 */
function SheetGrid({ rows }: { rows: SheetRow[] }) {
    return (
        <dl className="grid grid-cols-4 gap-x-3">
            {rows.map((row) => (
                <div key={row.label} className="border-b border-black/25 pb-1 pt-0.5">
                    <dt className="text-[8px] font-bold uppercase leading-tight tracking-wide text-black/55">{row.label}</dt>
                    <dd className="text-[10.5px] font-semibold leading-tight break-words">{row.value}</dd>
                </div>
            ))}
        </dl>
    );
}
