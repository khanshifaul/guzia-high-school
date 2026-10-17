// src/fees/waterfall.util.ts — oldest-first payment allocation (specs/06).
// The core money rule: a payment clears the student's OUTSTANDING invoices
// oldest-dueDate-first. Pure → unit-testable; the service runs it in a txn.

export type InvoiceStatus = "PENDING" | "PARTIAL" | "PAID";

export interface InvoiceLike {
    id: string;
    amount: number;
    dueDate: Date;
    /** Sum of allocations already applied to this invoice. */
    allocated: number;
}

export interface AllocationResult {
    invoiceId: string;
    amount: number;
}

export interface WaterfallResult {
    allocations: AllocationResult[];
    /** Money left over after covering every open invoice (student credit). */
    unallocated: number;
    /** New status per touched invoice. */
    statuses: { invoiceId: string; status: InvoiceStatus }[];
}

/** outstanding(inv) = assigned amount − already-allocated. */
export function outstanding(inv: InvoiceLike): number {
    return inv.amount - inv.allocated;
}

/**
 * Apply `paymentAmount` across open invoices, oldest-dueDate first.
 * Skips fully-paid invoices. Partial coverage marks the invoice PARTIAL.
 */
export function allocateWaterfall(
    paymentAmount: number,
    invoices: InvoiceLike[],
): WaterfallResult {
    const open = invoices
        .filter((inv) => outstanding(inv) > 0)
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    const allocations: AllocationResult[] = [];
    const statuses = new Map<string, InvoiceStatus>();
    let remaining = paymentAmount;

    for (const inv of open) {
        if (remaining <= 0) break;
        const due = outstanding(inv);
        const take = Math.min(remaining, due);
        if (take <= 0) continue;

        allocations.push({ invoiceId: inv.id, amount: take });
        remaining -= take;

        const newAllocated = inv.allocated + take;
        statuses.set(
            inv.id,
            newAllocated >= inv.amount ? "PAID" : "PARTIAL",
        );
    }

    return {
        allocations,
        unallocated: remaining,
        statuses: [...statuses].map(([invoiceId, status]) => ({ invoiceId, status })),
    };
}
