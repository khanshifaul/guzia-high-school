// lib/age.spec.ts — protects the age rule the wizard previews: the age is
// derived from the date of birth in completed years, and the school only
// admits ages inside its window.
import { describe, expect, it } from "vitest";

import { ageFromDateOfBirth, isAdmissibleAge, MAX_ADMISSION_AGE, MIN_ADMISSION_AGE } from "./age";

describe("age from date of birth", () => {
    it("counts the completed years", () => {
        // Born 12 May 2014 → 11 years old on 20 October 2025.
        expect(ageFromDateOfBirth("2014-05-12", new Date(2025, 9, 20))).toBe(11);
    });

    it("is the age turned on the birthday itself, and the day after", () => {
        expect(ageFromDateOfBirth("2014-05-12", new Date(2025, 4, 12))).toBe(11);
        expect(ageFromDateOfBirth("2014-05-12", new Date(2025, 4, 13))).toBe(11);
        expect(ageFromDateOfBirth("2014-05-12", new Date(2026, 4, 12))).toBe(12);
    });

    it("is one less the day before the birthday", () => {
        expect(ageFromDateOfBirth("2014-05-12", new Date(2025, 4, 11))).toBe(10);
    });

    it("handles a birthday on 29 February in a common year", () => {
        // Born 29 Feb 2016 → 8 on 28 Feb 2025, 9 on 1 Mar 2025. The
        // birthday falls on 1 March in a year with no 29 February.
        expect(ageFromDateOfBirth("2016-02-29", new Date(2025, 1, 28))).toBe(8);
        expect(ageFromDateOfBirth("2016-02-29", new Date(2025, 2, 1))).toBe(9);
    });

    it("reads the date of birth as a calendar date, not a UTC timestamp", () => {
        // `new Date("2014-05-12")` is UTC midnight, which is the 11th in a
        // timezone behind UTC. A calendar reading must not slip a day.
        const on = new Date(2025, 4, 12, 0, 30);
        expect(ageFromDateOfBirth("2014-05-12", on)).toBe(11);
    });

    it("is null for a missing date of birth", () => {
        expect(ageFromDateOfBirth("")).toBeNull();
        expect(ageFromDateOfBirth(null)).toBeNull();
        expect(ageFromDateOfBirth(undefined)).toBeNull();
    });

    it("is null for an unparseable date of birth", () => {
        expect(ageFromDateOfBirth("not-a-date")).toBeNull();
        expect(ageFromDateOfBirth("12/05/2014")).toBeNull();
    });

    it("is null for a day that does not exist", () => {
        expect(ageFromDateOfBirth("2014-02-30")).toBeNull();
        expect(ageFromDateOfBirth("2015-02-29")).toBeNull();
    });

    it("accepts a real leap day", () => {
        expect(ageFromDateOfBirth("2016-02-29", new Date(2025, 9, 20))).toBe(9);
    });
});

describe("admissible age", () => {
    it("accepts an age inside the window", () => {
        expect(isAdmissibleAge(MIN_ADMISSION_AGE)).toBe(true);
        expect(isAdmissibleAge(MAX_ADMISSION_AGE)).toBe(true);
        expect(isAdmissibleAge(14)).toBe(true);
    });

    it("refuses an age outside the window", () => {
        expect(isAdmissibleAge(MIN_ADMISSION_AGE - 1)).toBe(false);
        expect(isAdmissibleAge(MAX_ADMISSION_AGE + 1)).toBe(false);
    });

    it("refuses a null age", () => {
        expect(isAdmissibleAge(null)).toBe(false);
    });
});
