// lib/admission-application.ts — the admission application as one record.
//
// The wizard fills it in, the printable sheet renders it, and the receipt
// the API returns hangs off it: all three must agree on the field names,
// so the record lives here instead of inside the page component.
//
// Plain data and pure helpers only — no React, no browser APIs, so both
// the client wizard and the printable sheet can import it.

/** Every field the wizard collects, in one flat record. */
export interface ApplicationForm {
    studentName: string; studentNameBn: string; dateOfBirth: string; gender: string;
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
    classWanted: string; group: string; admissionType: string; shift: string;
    previousSchool: string; previousClass: string; previousResult: string; tcNumber: string; tcDate: string; previousSchoolPhone: string;
    quota: string; declarationAccepted: boolean; note: string;
    /** The hidden spam trap. It must stay empty; the server refuses a filled one. */
    website: string;
}

/** The files the applicant attached, by the URL the upload endpoint returned. */
export interface ApplicationFiles {
    photoUrl?: string;
    birthCertUrl?: string;
    testimonialUrl?: string;
}

/** What POST /admissions returns, and what the session keeps for the print view. */
export interface AdmissionReceipt extends ApplicationFiles {
    id: string;
    studentName: string;
    classWanted: string;
    emailSent: boolean;
}

/** The blank form the wizard starts from. */
export const EMPTY_APPLICATION: ApplicationForm = {
    studentName: "", studentNameBn: "", dateOfBirth: "", gender: "", birthCertNo: "",
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
    classWanted: "", group: "", admissionType: "day", shift: "",
    previousSchool: "", previousClass: "", previousResult: "", tcNumber: "", tcDate: "", previousSchoolPhone: "",
    quota: "general", declarationAccepted: false, note: "", website: "",
};

/** The Bangla names of the closed lists, next to their English keys. */
export const RELIGION_BN: Record<string, string> = { islam: "ইসলাম", hinduism: "হিন্দু", christianity: "খ্রিস্টান", buddhism: "বৌদ্ধ", other: "অন্যান্য" };
export const GROUP_BN: Record<string, string> = { science: "বিজ্ঞান", humanities: "মানবিক", business: "ব্যবসায় শিক্ষা" };
export const ADMISSION_TYPE_BN: Record<string, string> = { day: "দিবা (Day)", residential: "আবাসিক (Residential)" };
export const QUOTA_BN: Record<string, string> = { general: "সাধারণ", "freedom-fighter": "মুক্তিযোদ্ধা", employee: "কর্মচারী", "staff-child": "স্টাফ সন্তান", sibling: "ভাই/বোন", tribal: "উপজাতি" };
export const GENDER_BN: Record<string, string> = { male: "পুরুষ", female: "নারী", other: "অন্যান্য" };
export const RELATION_BN: Record<string, string> = { father: "পিতা", mother: "মাতা", guardian: "অভিভাবক" };

/** One attachment the applicant can upload. */
export interface ApplicationAttachment {
    label: string;
    labelBn: string;
    /** The kind the upload endpoint stores the file under. */
    kind: string;
    accept: string;
    /** The rule the file has to meet, shown under the upload box. */
    hint?: string;
    hintBn?: string;
}

/** The attachments the academic step uploads. */
export const APPLICATION_ATTACHMENTS: Record<keyof ApplicationFiles, ApplicationAttachment> = {
    photoUrl: {
        label: "Student Photo",
        labelBn: "শিক্ষার্থীর ছবি",
        kind: "photo",
        accept: "image/*",
        hint: "Exactly 300×300 px, max 1 MB",
        hintBn: "ঠিক ৩০০×৩০০ পিক্সেল, সর্বোচ্চ ১ MB",
    },
    birthCertUrl: {
        label: "Birth Certificate",
        labelBn: "জন্মনিবন্ধন",
        kind: "birthCert",
        accept: "image/*,application/pdf",
        hint: "Image or PDF",
        hintBn: "ছবি বা PDF",
    },
    testimonialUrl: {
        label: "Testimonial / Transfer Certificate",
        labelBn: "প্রশংসাপত্র / ট্রান্সফার সার্টিফিকেট",
        kind: "testimonial",
        accept: "image/*,application/pdf",
        hint: "Image or PDF",
        hintBn: "ছবি বা PDF",
    },
};

/** The keys of the attachments, in the order the sheet lists them. */
export const ATTACHMENT_KEYS = Object.keys(APPLICATION_ATTACHMENTS) as (keyof ApplicationFiles)[];

/** The present address, as one line. */
export function presentAddress(form: ApplicationForm): string {
    return [
        form.presentVillage, form.presentRoad, form.presentWard, form.presentPostOffice,
        form.presentPoliceStation, form.presentUpazila, form.presentDistrict, form.presentPostalCode,
    ].map((p) => p.trim()).filter(Boolean).join(", ");
}

/** The permanent address — the present one when the applicant ticked "same". */
export function permanentAddress(form: ApplicationForm): string {
    if (form.permanentSameAsPresent) return presentAddress(form);
    return [
        form.permanentVillage, form.permanentRoad, form.permanentWard, form.permanentPostOffice,
        form.permanentPoliceStation, form.permanentUpazila, form.permanentDistrict, form.permanentPostalCode,
    ].map((p) => p.trim()).filter(Boolean).join(", ");
}

/**
 * The application number the applicant quotes: the last eight characters of
 * the application id, upper-cased. The same number the receipt shows.
 */
export function applicationNumber(receipt: AdmissionReceipt | null): string {
    return receipt ? receipt.id.slice(-8).toUpperCase() : "";
}
