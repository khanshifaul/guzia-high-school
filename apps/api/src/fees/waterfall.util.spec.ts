// src/fees/waterfall.util.spec.ts — protects the money rule (specs/06 #3):
// oldest-first allocation, PAID vs PARTIAL transitions, and leftover credit.
import { allocateWaterfall, outstanding, type InvoiceLike } from './waterfall.util';

function inv(id: string, amount: number, allocated: number, dueDate: string): InvoiceLike {
    return { id, amount, allocated, dueDate: new Date(dueDate) };
}

describe('payment waterfall (oldest-first)', () => {
    it('clears a single invoice exactly (→ PAID, no leftover)', () => {
        const result = allocateWaterfall(1200, [inv('a', 1200, 0, '2026-10-10')]);
        expect(result.allocations).toEqual([{ invoiceId: 'a', amount: 1200 }]);
        expect(result.statuses).toEqual([{ invoiceId: 'a', status: 'PAID' }]);
        expect(result.unallocated).toBe(0);
    });

    it('allocates across invoices oldest-dueDate first', () => {
        // Deliberately unordered input: Nov invoice listed before the older Oct one.
        const result = allocateWaterfall(1500, [
            inv('nov', 1000, 0, '2026-11-10'),
            inv('oct', 1000, 0, '2026-10-10'),
        ]);
        expect(result.allocations[0]).toEqual({ invoiceId: 'oct', amount: 1000 });
        expect(result.allocations[1]).toEqual({ invoiceId: 'nov', amount: 500 });
        expect(result.statuses).toEqual([
            { invoiceId: 'oct', status: 'PAID' },
            { invoiceId: 'nov', status: 'PARTIAL' },
        ]);
    });

    it('marks an invoice PARTIAL when underpaid', () => {
        const result = allocateWaterfall(500, [inv('a', 1200, 0, '2026-10-10')]);
        expect(result.allocations).toEqual([{ invoiceId: 'a', amount: 500 }]);
        expect(result.statuses).toEqual([{ invoiceId: 'a', status: 'PARTIAL' }]);
    });

    it('skips already-PAID invoices (outstanding 0)', () => {
        const result = allocateWaterfall(500, [
            inv('paid', 1200, 1200, '2026-10-10'),
            inv('open', 500, 0, '2026-11-10'),
        ]);
        expect(result.allocations).toEqual([{ invoiceId: 'open', amount: 500 }]);
        expect(result.allocations).toHaveLength(1);
    });

    it('respects prior partial allocations when computing outstanding', () => {
        // 1200 invoice with 700 already allocated → 500 outstanding.
        expect(outstanding(inv('a', 1200, 700, '2026-10-10'))).toBe(500);
        const result = allocateWaterfall(500, [inv('a', 1200, 700, '2026-10-10')]);
        expect(result.statuses).toEqual([{ invoiceId: 'a', status: 'PAID' }]);
    });

    it('reports leftover as unallocated (student credit)', () => {
        const result = allocateWaterfall(5000, [inv('a', 1200, 0, '2026-10-10')]);
        expect(result.unallocated).toBe(3800);
        expect(result.allocations).toHaveLength(1);
    });

    it('handles zero open invoices gracefully', () => {
        const result = allocateWaterfall(1000, []);
        expect(result.allocations).toEqual([]);
        expect(result.unallocated).toBe(1000);
        expect(result.statuses).toEqual([]);
    });
});
