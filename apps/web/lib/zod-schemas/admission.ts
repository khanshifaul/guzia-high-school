// lib/zod-schemas/admission.ts — the public admission wizard's per-step
// schemas (specs/06 §public: "4-step wizard (student info → guardian info →
// academic choice → review+submit), zod schema per step").
//
// These mirror the API DTO (POST /admissions) so the browser can refuse a
// bad step before the applicant spends time on the next one, and the server
// still validates everything again. The server is the authority; these
// schemas exist to guide the applicant, never to replace the server.
//
// Step 1 — student info
// Step 2 — guardian info (parents, guardian, contact, address)
// Step 3 — academic choice (class, group, previous school, quota, files)
// Step 4 — review: the declaration, plus the full payload assembled from
//          steps 1-3.

import { z } from "zod";

import { ageFromDateOfBirth, isAdmissibleAge } from "../age";

export const RELIGIONS = ["islam", "hinduism", "christianity", "buddhism", "other"] as const;
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export const GROUPS = ["science", "humanities", "business"] as const;
export const ADMISSION_TYPES = ["day", "residential"] as const;
export const QUOTAS = ["general", "freedom-fighter", "employee", "staff-child", "sibling", "tribal"] as const;
export const CLASSES = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"] as const;

/** Classes below the school's entry class, used for the transfer history. */
const CLASSES_WITH_PREVIOUS = ["Class 5", ...CLASSES];

/** Only Class 9 and Class 10 split students into groups. */
export const GROUP_CLASSES = ["Class 9", "Class 10"] as const;

/** True when the applied class offers groups (science/humanities/business). */
export function classHasGroups(classWanted: string): boolean {
    return (GROUP_CLASSES as readonly string[]).includes(classWanted);
}

/**
 * Valid previous classes for a transfer applicant: from Class 5 up to the
 * class applied for, exclusive. Class 6 → [Class 5]; Class 10 → Class 5–9.
 * The school does not record anything below Class 5.
 */
export function previousClassOptions(classWanted: string): string[] {
    const index = CLASSES_WITH_PREVIOUS.indexOf(classWanted);
    if (index <= 0) return [];
    return CLASSES_WITH_PREVIOUS.slice(0, index);
}

/** Rules that span two academic-step fields; shared by the step and the form. */
function refineAcademic(
    value: { classWanted?: string; group?: string; previousClass?: string },
    ctx: z.RefinementCtx,
): void {
    if (value.group && !classHasGroups(value.classWanted ?? "")) {
        ctx.addIssue({
            code: "custom",
            path: ["group"],
            message: "Groups apply to Class 9 and 10 only",
        });
    }
    const allowed = previousClassOptions(value.classWanted ?? "");
    if (value.previousClass && allowed.length > 0 && !allowed.includes(value.previousClass)) {
        ctx.addIssue({
            code: "custom",
            path: ["previousClass"],
            message: `Choose a class below ${value.classWanted} (${allowed[0]}–${allowed[allowed.length - 1]})`,
        });
    }
}
export const GENDERS = ["male", "female", "other"] as const;
export const RELATIONS = ["father", "mother", "guardian"] as const;

/** A trimmed string that may be empty. */
const optionalText = z.string().trim().max(200).optional();

/** Bangladeshi mobile: 11 digits starting 01, optionally +88, spaces allowed. */
export const phoneSchema = z
    .string()
    .trim()
    .refine(
        (v) => /^(?:\+?88)?0?1[3-9]\d{8}$/.test(v.replace(/[\s-]/g, "")),
        { message: "Enter a valid Bangladeshi mobile number (e.g. 01712345678)" },
    );

export const emailSchema = z
    .string()
    .trim()
    .min(1, { message: "Email is required" })
    .email({ message: "Enter a valid email address" });

/** An ISO date string (YYYY-MM-DD) that is a real calendar day. */
const isoDate = z
    .string()
    .trim()
    .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)), {
        message: "Enter a valid date",
    });

// ─── Step 1 — student information ────────────────────────────────

export const studentStepSchema = z.object({
    studentName: z
        .string()
        .trim()
        .min(2, { message: "Enter the student's name" })
        .max(120),
    studentNameBn: optionalText,
    // The age is derived from the date of birth, never typed in, so the
    // step checks that the date of birth lands in the school's age window
    // rather than checking a typed age.
    dateOfBirth: isoDate
        .optional()
        .or(z.literal(""))
        .refine((v) => v === "" || isAdmissibleAge(ageFromDateOfBirth(v)), {
            message: "The date of birth does not match the age range for admission",
        }),
    gender: z.enum(GENDERS).optional().or(z.literal("")),
    birthCertNo: z.string().trim().max(40).optional(),
    religion: z.enum(RELIGIONS).optional().or(z.literal("")),
    nationality: z.string().trim().max(40).default("Bangladeshi"),
    bloodGroup: z.enum(BLOOD_GROUPS).optional().or(z.literal("")),
});

export type StudentStep = z.infer<typeof studentStepSchema>;

// ─── Step 2 — guardian and contact ───────────────────────────────

export const guardianStepSchema = z.object({
    fatherName: z.string().trim().max(120).optional(),
    fatherNameBn: optionalText,
    fatherProfession: z.string().trim().max(80).optional(),
    fatherNid: z.string().trim().max(40).optional(),
    fatherPhone: z.string().trim().max(20).optional(),
    motherName: z.string().trim().max(120).optional(),
    motherNameBn: optionalText,
    motherProfession: z.string().trim().max(80).optional(),
    motherNid: z.string().trim().max(40).optional(),
    motherPhone: z.string().trim().max(20).optional(),
    guardianName: z
        .string()
        .trim()
        .min(2, { message: "Enter the guardian's name" })
        .max(120),
    guardianRelation: z.enum(RELATIONS).default("father"),
    localGuardianProfession: z.string().trim().max(80).optional(),
    guardianNid: z.string().trim().max(40).optional(),
    phone: phoneSchema,
    emergencyPhone: z.string().trim().max(20).optional(),
    email: emailSchema,
    presentVillage: z.string().trim().max(160).optional(),
    presentRoad: z.string().trim().max(40).optional(),
    presentWard: z.string().trim().max(40).optional(),
    presentPostOffice: z.string().trim().max(80).optional(),
    presentPoliceStation: z.string().trim().max(80).optional(),
    presentUpazila: z.string().trim().max(80).optional(),
    presentDistrict: z.string().trim().max(80).optional(),
    presentPostalCode: z.string().trim().max(20).optional(),
    permanentSameAsPresent: z.boolean().default(true),
    permanentVillage: z.string().trim().max(160).optional(),
    permanentRoad: z.string().trim().max(40).optional(),
    permanentWard: z.string().trim().max(40).optional(),
    permanentPostOffice: z.string().trim().max(80).optional(),
    permanentPoliceStation: z.string().trim().max(80).optional(),
    permanentUpazila: z.string().trim().max(80).optional(),
    permanentDistrict: z.string().trim().max(80).optional(),
    permanentPostalCode: z.string().trim().max(20).optional(),
});

export type GuardianStep = z.infer<typeof guardianStepSchema>;

// ─── Step 3 — academic choice ────────────────────────────────────

export const academicStepSchema = z.object({
    classWanted: z.enum(CLASSES, { message: "Choose a class" }),
    group: z.enum(GROUPS).optional().or(z.literal("")),
    admissionType: z.enum(ADMISSION_TYPES).default("day"),
    shift: z.string().trim().max(40).optional(),
    previousSchool: z.string().trim().max(160).optional(),
    previousClass: z.string().trim().max(40).optional(),
    previousResult: z.string().trim().max(40).optional(),
    tcNumber: z.string().trim().max(40).optional(),
    tcDate: isoDate.optional().or(z.literal("")),
    previousSchoolPhone: z.string().trim().max(20).optional(),
    quota: z.enum(QUOTAS).default("general"),
    photoUrl: z.string().max(500).optional(),
    birthCertUrl: z.string().max(500).optional(),
    testimonialUrl: z.string().max(500).optional(),
    note: z.string().trim().max(500).optional(),
}).superRefine(refineAcademic);

export type AcademicStep = z.infer<typeof academicStepSchema>;

// ─── Step 4 — review and submit ──────────────────────────────────

export const reviewStepSchema = z.object({
    declarationAccepted: z.literal(true, {
        message: "Accept the declaration to submit",
    }),
});

export type ReviewStep = z.infer<typeof reviewStepSchema>;

// ─── The whole application ───────────────────────────────────────

export const admissionSchema = z
    .object({
        ...studentStepSchema.shape,
        ...guardianStepSchema.shape,
        ...academicStepSchema.shape,
        ...reviewStepSchema.shape,
    })
    .superRefine((value, ctx) => {
        // The permanent address is only meaningful when it differs from the
        // present one; the API copies the present address when it matches.
        if (!value.permanentSameAsPresent && !value.permanentVillage && !value.permanentDistrict) {
            ctx.addIssue({
                code: "custom",
                path: ["permanentVillage"],
                message: "Enter the permanent address, or tick 'same as present address'",
            });
        }
        refineAcademic(value, ctx);
    });

export type AdmissionForm = z.infer<typeof admissionSchema>;

/** The steps of the wizard, in order. The index is the step number minus one. */
export const ADMISSION_STEPS = [
    { key: "student", title: "Student Information", titleBn: "শিক্ষার্থীর তথ্য" },
    { key: "guardian", title: "Guardian & Contact", titleBn: "অভিভাবক ও যোগাযোগ" },
    { key: "academic", title: "Academic Choice", titleBn: "একাডেমিক পছন্দ" },
    { key: "review", title: "Review & Submit", titleBn: "পর্যালোচনা ও জমা" },
] as const;

export type AdmissionStepKey = (typeof ADMISSION_STEPS)[number]["key"];

/** The fields each step owns. The review step lists them in this order. */
export const STEP_FIELDS = {
    student: ["studentName", "studentNameBn", "dateOfBirth", "gender", "birthCertNo", "religion", "nationality", "bloodGroup"],
    guardian: ["fatherName", "fatherNameBn", "fatherProfession", "fatherNid", "fatherPhone",
        "motherName", "motherNameBn", "motherProfession", "motherNid", "motherPhone",
        "guardianName", "guardianRelation", "localGuardianProfession", "guardianNid",
        "phone", "emergencyPhone", "email",
        "presentVillage", "presentRoad", "presentWard", "presentPostOffice", "presentPoliceStation",
        "presentUpazila", "presentDistrict", "presentPostalCode",
        "permanentVillage", "permanentRoad", "permanentWard", "permanentPostOffice",
        "permanentPoliceStation", "permanentUpazila", "permanentDistrict", "permanentPostalCode"],
    academic: ["classWanted", "group", "admissionType", "shift", "previousSchool", "previousClass",
        "previousResult", "tcNumber", "tcDate", "previousSchoolPhone", "quota"],
} as const;

export type StepFieldKey = keyof typeof STEP_FIELDS;

/**
 * The step that owns a field, so an invalid field sends the applicant back
 * to the step that can fix it. 0 = student, 1 = guardian, 2 = academic,
 * 3 = review.
 */
export function stepForField(field: string): number {
    // includes(), never `in`: `in` on an array tests the INDICES, so a field
    // name never matches and every field would fall through to review.
    const owns = (fields: readonly string[]) => fields.includes(field);
    if (owns(STEP_FIELDS.student)) return 0;
    if (owns(STEP_FIELDS.guardian)) return 1;
    if (owns(STEP_FIELDS.academic)) return 2;
    return 3;
}

/**
 * Map a zod issue to the form field it belongs to, so the wizard can show
 * the message next to the input rather than in a banner at the top.
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
    const out: Record<string, string> = {};
    for (const issue of error.issues) {
        const key = issue.path.join(".");
        if (key && !out[key]) out[key] = issue.message;
    }
    return out;
}
