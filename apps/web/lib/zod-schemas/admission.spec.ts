// lib/zod-schemas/admission.spec.ts — the admission wizard's per-step
// schemas (specs/08: "wizard schema: each step rejects missing/invalid
// (bn phone, class enum); full payload parses").

import { describe, expect, it } from "vitest";
import {
    academicStepSchema,
    admissionSchema,
    fieldErrors,
    guardianStepSchema,
    reviewStepSchema,
    studentStepSchema,
} from "./admission";

describe("studentStepSchema", () => {
    it("accepts a minimal student", () => {
        const result = studentStepSchema.safeParse({ studentName: "Ayesha Rahman" });
        expect(result.success).toBe(true);
    });

    it("rejects a missing name", () => {
        const result = studentStepSchema.safeParse({ studentName: "" });
        expect(result.success).toBe(false);
    });

    it("rejects a one-character name", () => {
        const result = studentStepSchema.safeParse({ studentName: "A" });
        expect(result.success).toBe(false);
    });

    it("rejects an unknown gender", () => {
        const result = studentStepSchema.safeParse({ studentName: "Ayesha Rahman", gender: "unknown" });
        expect(result.success).toBe(false);
    });

    it("rejects an unknown religion", () => {
        const result = studentStepSchema.safeParse({ studentName: "Ayesha Rahman", religion: "atheist" });
        expect(result.success).toBe(false);
    });

    it("rejects an impossible date of birth", () => {
        const result = studentStepSchema.safeParse({ studentName: "Ayesha Rahman", dateOfBirth: "not-a-date" });
        expect(result.success).toBe(false);
    });

    it("defaults the nationality to Bangladeshi", () => {
        const result = studentStepSchema.safeParse({ studentName: "Ayesha Rahman" });
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.nationality).toBe("Bangladeshi");
    });
});

describe("guardianStepSchema", () => {
    const base = {
        guardianName: "Karim Uddin",
        phone: "01712345678",
        email: "karim@example.com",
    };

    it("accepts a minimal guardian step", () => {
        const result = guardianStepSchema.safeParse(base);
        expect(result.success).toBe(true);
    });

    it("rejects a missing guardian name", () => {
        const result = guardianStepSchema.safeParse({ ...base, guardianName: "" });
        expect(result.success).toBe(false);
    });

    it("rejects a missing phone", () => {
        const result = guardianStepSchema.safeParse({ ...base, phone: "" });
        expect(result.success).toBe(false);
    });

    it("rejects a malformed phone", () => {
        const result = guardianStepSchema.safeParse({ ...base, phone: "12345" });
        expect(result.success).toBe(false);
    });

    it("rejects a Bangladeshi phone that does not start 01", () => {
        const result = guardianStepSchema.safeParse({ ...base, phone: "1234567890" });
        expect(result.success).toBe(false);
    });

    it("accepts a phone written with the +88 prefix", () => {
        const result = guardianStepSchema.safeParse({ ...base, phone: "+8801712345678" });
        expect(result.success).toBe(true);
    });

    it("accepts a phone written with spaces", () => {
        const result = guardianStepSchema.safeParse({ ...base, phone: "017 1234 5678" });
        expect(result.success).toBe(true);
    });

    it("rejects a missing email", () => {
        const result = guardianStepSchema.safeParse({ ...base, email: "" });
        expect(result.success).toBe(false);
    });

    it("rejects a malformed email", () => {
        const result = guardianStepSchema.safeParse({ ...base, email: "karim-at-example" });
        expect(result.success).toBe(false);
    });

    it("defaults the guardian relation to father", () => {
        const result = guardianStepSchema.safeParse(base);
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.guardianRelation).toBe("father");
    });

    it("defaults the permanent address to the present one", () => {
        const result = guardianStepSchema.safeParse(base);
        expect(result.success).toBe(true);
        if (result.success) expect(result.data.permanentSameAsPresent).toBe(true);
    });
});

describe("academicStepSchema", () => {
    it("accepts a class from the list", () => {
        const result = academicStepSchema.safeParse({ classWanted: "Class 8" });
        expect(result.success).toBe(true);
    });

    it("rejects a class that is not on the list", () => {
        const result = academicStepSchema.safeParse({ classWanted: "Class 12" });
        expect(result.success).toBe(false);
    });

    it("rejects a missing class", () => {
        const result = academicStepSchema.safeParse({});
        expect(result.success).toBe(false);
    });

    it("rejects an unknown admission type", () => {
        const result = academicStepSchema.safeParse({ classWanted: "Class 8", admissionType: "evening" });
        expect(result.success).toBe(false);
    });

    it("rejects an unknown quota", () => {
        const result = academicStepSchema.safeParse({ classWanted: "Class 8", quota: "nepotism" });
        expect(result.success).toBe(false);
    });

    it("rejects an unknown group", () => {
        const result = academicStepSchema.safeParse({ classWanted: "Class 8", group: "arts" });
        expect(result.success).toBe(false);
    });

    it("defaults the admission type to day and the quota to general", () => {
        const result = academicStepSchema.safeParse({ classWanted: "Class 8" });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.admissionType).toBe("day");
            expect(result.data.quota).toBe("general");
        }
    });
});

describe("reviewStepSchema", () => {
    it("rejects an unchecked declaration", () => {
        const result = reviewStepSchema.safeParse({ declarationAccepted: false });
        expect(result.success).toBe(false);
    });

    it("accepts a checked declaration", () => {
        const result = reviewStepSchema.safeParse({ declarationAccepted: true });
        expect(result.success).toBe(true);
    });
});

describe("admissionSchema (the full payload)", () => {
    const full = {
        studentName: "Ayesha Rahman",
        studentNameBn: "আয়েশা রহমান",
        dateOfBirth: "2014-05-12",
        gender: "female",
        religion: "islam",
        nationality: "Bangladeshi",
        bloodGroup: "A+",
        guardianName: "Karim Uddin",
        guardianRelation: "father",
        phone: "01712345678",
        email: "karim@example.com",
        presentVillage: "Guzia",
        presentUpazila: "Guzia",
        presentDistrict: "Gopalganj",
        permanentSameAsPresent: true,
        classWanted: "Class 8",
        section: "A",
        group: "science",
        admissionType: "day",
        previousSchool: "Guzia Primary School",
        quota: "general",
        declarationAccepted: true,
    };

    it("parses a complete application", () => {
        const result = admissionSchema.safeParse(full);
        expect(result.success).toBe(true);
    });

    it("fails when the phone is missing", () => {
        const { phone: _phone, ...withoutPhone } = full;
        const result = admissionSchema.safeParse(withoutPhone);
        expect(result.success).toBe(false);
    });

    it("fails when the declaration is unchecked", () => {
        const result = admissionSchema.safeParse({ ...full, declarationAccepted: false });
        expect(result.success).toBe(false);
    });

    it("fails when a permanent address is asked for but left empty", () => {
        const result = admissionSchema.safeParse({
            ...full,
            permanentSameAsPresent: false,
            permanentVillage: "",
            permanentDistrict: "",
        });
        expect(result.success).toBe(false);
    });

    it("accepts a distinct permanent address", () => {
        const result = admissionSchema.safeParse({
            ...full,
            permanentSameAsPresent: false,
            permanentVillage: "Dhaka",
            permanentDistrict: "Dhaka",
        });
        expect(result.success).toBe(true);
    });
});

describe("fieldErrors", () => {
    it("keys each message by the field path", () => {
        const result = guardianStepSchema.safeParse({ guardianName: "", phone: "bad", email: "bad" });
        expect(result.success).toBe(false);
        if (result.success) throw new Error("expected the parse to fail");
        const errors = fieldErrors(result.error);
        expect(errors.guardianName).toBeTruthy();
        expect(errors.phone).toBeTruthy();
        expect(errors.email).toBeTruthy();
    });
});
