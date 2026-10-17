// src/attendance/attendance.util.spec.ts — protects the weighted-attendance
// rule (specs/06 #2): (PRESENT·1 + LATE·0.5) / total · 100, 1dp.
import { weightedAttendancePct } from './attendance.util';

describe('weighted attendance %', () => {
    it('is 100 when everyone is present', () => {
        expect(
            weightedAttendancePct([
                { status: 'PRESENT' },
                { status: 'PRESENT' },
                { status: 'PRESENT' },
            ]),
        ).toBe(100);
    });

    it('halves the weight of LATE', () => {
        // 10 present, 2 late, 3 absent → (10 + 1) / 15 = 73.3%
        const records = [
            ...Array.from({ length: 10 }, () => ({ status: 'PRESENT' as const })),
            ...Array.from({ length: 2 }, () => ({ status: 'LATE' as const })),
            ...Array.from({ length: 3 }, () => ({ status: 'ABSENT' as const })),
        ];
        expect(weightedAttendancePct(records)).toBe(73.3);
    });

    it('is 0 for an empty record set (not NaN)', () => {
        expect(weightedAttendancePct([])).toBe(0);
    });

    it('is 0 when all absent', () => {
        expect(weightedAttendancePct([{ status: 'ABSENT' }, { status: 'ABSENT' }])).toBe(0);
    });

    it('rounds to 1 decimal place', () => {
        // 1 present, 1 late, 1 absent → (1 + 0.5)/3 = 50.0
        expect(
            weightedAttendancePct([
                { status: 'PRESENT' },
                { status: 'LATE' },
                { status: 'ABSENT' },
            ]),
        ).toBe(50);
    });
});
