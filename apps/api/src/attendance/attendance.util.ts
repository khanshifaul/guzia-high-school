// src/attendance/attendance.util.ts — weighted-attendance rule (specs/06).
// attendancePct = (PRESENT·1 + LATE·0.5) / total · 100, 1dp.
// Pure → unit-testable; reused by students stats + AI features.

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";

export interface AttendanceLike {
    status: AttendanceStatus;
}

export function weightedAttendancePct(records: AttendanceLike[]): number {
    if (records.length === 0) return 0;
    const weighted = records.reduce((sum, r) => {
        if (r.status === "PRESENT") return sum + 1;
        if (r.status === "LATE") return sum + 0.5;
        return sum; // ABSENT contributes 0
    }, 0);
    return Math.round((weighted / records.length) * 1000) / 10;
}
