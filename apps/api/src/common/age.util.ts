// src/common/age.util.ts — the age rule, in one place.
//
// A student's age is DERIVED from their date of birth, never typed in and
// never trusted from the client: an age the applicant entered can disagree
// with their date of birth, and the school needs the two to agree.
//
// The same rule runs in the browser (apps/web/lib/age.ts) so the wizard can
// show the age as the applicant types. This file is the server's copy and
// the authority — the server recomputes the age and ignores whatever age
// the client sent.
//
// The age is the number of COMPLETED years: the day before the birthday
// the applicant is still the age they turned on the previous birthday.

/** The minimum age the school admits (Class 6 entrant). */
export const MIN_ADMISSION_AGE = 10;

/** The maximum age the school admits (an older entrant is out of scope). */
export const MAX_ADMISSION_AGE = 25;

/**
 * The age in completed years on `on`, from a date of birth.
 *
 * Returns null when the date of birth is missing or unparseable — the
 * caller decides whether that is an error (it is, on the admission form).
 *
 * The date of birth is read as a CALENDAR date (year, month, day), never
 * as a timestamp: `new Date("2014-05-12")` is parsed as UTC midnight, which
 * in a timezone behind UTC is the 11th, and would put a birthday a day out.
 */
export function ageFromDateOfBirth(dateOfBirth: string | Date | null | undefined, on: Date = new Date()): number | null {
    if (!dateOfBirth) return null;

    let year: number;
    let month: number;
    let day: number;

    if (dateOfBirth instanceof Date) {
        if (Number.isNaN(dateOfBirth.getTime())) return null;
        year = dateOfBirth.getFullYear();
        month = dateOfBirth.getMonth() + 1;
        day = dateOfBirth.getDate();
    } else {
        // "YYYY-MM-DD" — the only shape the form and the DTO accept.
        const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOfBirth.trim());
        if (!match) return null;
        year = Number(match[1]);
        month = Number(match[2]);
        day = Number(match[3]);
        // Reject a date that is not a real day (e.g. 2014-02-30).
        const probe = new Date(year, month - 1, day);
        if (probe.getFullYear() !== year || probe.getMonth() !== month - 1 || probe.getDate() !== day) {
            return null;
        }
    }

    let age = on.getFullYear() - year;
    // The birthday has not come round yet this year.
    const monthNow = on.getMonth() + 1;
    if (monthNow < month || (monthNow === month && on.getDate() < day)) age -= 1;
    return age;
}

/**
 * Whether an age is plausible for admission to the school.
 *
 * A date of birth that puts the applicant outside the age window is a
 * data-entry slip, not a real applicant, so it is refused rather than
 * stored — an admin would otherwise have to spot it in the queue.
 */
export function isAdmissibleAge(age: number | null): boolean {
    return age !== null && age >= MIN_ADMISSION_AGE && age <= MAX_ADMISSION_AGE;
}
