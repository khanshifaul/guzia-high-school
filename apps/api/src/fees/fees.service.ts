// src/fees/fees.service.ts — fee heads, invoice generation, and payment
// recording via the oldest-first waterfall (specs/06).
import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { allocateWaterfall, outstanding, type InvoiceLike } from './waterfall.util';
import { CreateFeeHeadDto, GenerateInvoicesDto, RecordPaymentDto } from './dto';

@Injectable()
export class FeesModuleService {
    constructor(private readonly prisma: DatabaseService) {}

    async feeHeads() {
        return this.prisma.feeHead.findMany({
            include: { class: true, _count: { select: { invoices: true } } },
            orderBy: { name: 'asc' },
        });
    }

    async createFeeHead(dto: CreateFeeHeadDto) {
        if (dto.classId) {
            const cls = await this.prisma.class.findUnique({ where: { id: dto.classId } });
            if (!cls) throw new NotFoundException('Class not found');
        }
        const existing = await this.prisma.feeHead.findUnique({ where: { name: dto.name } });
        if (existing) throw new BadRequestException(`Fee head "${dto.name}" already exists`);
        return this.prisma.feeHead.create({
            data: { name: dto.name, amount: dto.amount, classId: dto.classId },
        });
    }

    /** Bulk-assign a fee head to students (all active, or one class). */
    async generateInvoices(dto: GenerateInvoicesDto) {
        const head = await this.prisma.feeHead.findUnique({ where: { id: dto.feeHeadId } });
        if (!head) throw new NotFoundException('Fee head not found');

        const dueDate = new Date(dto.dueDate);
        // `(studentId, feeHeadId, dueDate)` is unique, so a re-run inserts
        // nothing instead of duplicating the batch. A new installment needs a
        // new dueDate (Q-0005).
        const result = await this.prisma.$transaction(async (tx) => {
            const students = await tx.student.findMany({
                where: {
                    status: 'ACTIVE',
                    ...(dto.classId
                        ? { OR: [{ classId: dto.classId }, { class: { id: dto.classId } }] }
                        : {}),
                },
            });
            if (students.length === 0) throw new BadRequestException('No students matched');

            const { count } = await tx.invoice.createMany({
                data: students.map((s) => ({
                    studentId: s.id,
                    feeHeadId: head.id,
                    amount: head.amount,
                    dueDate,
                })),
                skipDuplicates: true,
            });
            return { created: count, skipped: students.length - count };
        });
        return { ...result, amount: head.amount };
    }

    /** A student's ledger: invoices (with outstanding) + payments. */
    async studentLedger(studentId: string) {
        const student = await this.prisma.student.findUnique({ where: { id: studentId } });
        if (!student) throw new NotFoundException('Student not found');

        const [invoices, payments] = await Promise.all([
            this.prisma.invoice.findMany({
                where: { studentId },
                include: { feeHead: true, allocations: true },
                orderBy: { dueDate: 'asc' },
            }),
            this.prisma.payment.findMany({
                where: { studentId },
                include: { allocations: true },
                orderBy: { paidAt: 'desc' },
            }),
        ]);

        const now = Date.now();
        const shaped = invoices.map((inv) => {
            const allocated = inv.allocations.reduce((s, a) => s + a.amount, 0);
            const due = inv.amount - allocated;
            return {
                id: inv.id,
                feeHead: inv.feeHead.name,
                amount: inv.amount,
                dueDate: inv.dueDate,
                status: inv.status,
                allocated,
                outstanding: due,
                overdueDays:
                    inv.status !== 'PAID' && inv.dueDate.getTime() < now
                        ? Math.floor((now - inv.dueDate.getTime()) / 86400000)
                        : 0,
            };
        });

        const totalDue = shaped.reduce((s, i) => s + i.outstanding, 0);
        return { studentId, invoices: shaped, payments, totalDue };
    }

    /** Record a payment; allocate oldest-first across open invoices (txn). */
    async recordPayment(dto: RecordPaymentDto, recordedById: string) {
        const student = await this.prisma.student.findUnique({ where: { id: dto.studentId } });
        if (!student) throw new NotFoundException('Student not found');

        // Fast path only: reject an obviously oversized payment without waiting
        // for locks. The transaction below re-reads and re-checks for real.
        const snapshot = await this.invoiceSnapshot(this.prisma, { studentId: dto.studentId });
        const visibleOutstanding = snapshot.reduce((s, i) => s + outstanding(i), 0);
        if (dto.amount > visibleOutstanding) {
            throw new BadRequestException(
                `Payment ${dto.amount} exceeds outstanding balance ${visibleOutstanding}`,
            );
        }

        for (let attempt = 1; ; attempt++) {
            try {
                return await this.prisma.$transaction(async (tx) => {
                    // Lock the student's invoices in a deterministic order so two
                    // concurrent payments serialise instead of both allocating
                    // against the same stale snapshot (Q-0004).
                    const locked = await tx.$queryRaw<{ id: string }[]>`
                        SELECT id FROM "Invoice"
                        WHERE "studentId" = ${dto.studentId}
                        ORDER BY "dueDate", id
                        FOR UPDATE
                    `;
                    const invoices = await this.invoiceSnapshot(tx, {
                        id: { in: locked.map((row) => row.id) },
                    });

                    // The fast path is never the only guard: re-check against
                    // the locked balance.
                    const lockedOutstanding = invoices.reduce((s, i) => s + outstanding(i), 0);
                    if (dto.amount > lockedOutstanding) {
                        throw new BadRequestException(
                            `Payment ${dto.amount} exceeds outstanding balance ${lockedOutstanding}`,
                        );
                    }

                    const result = allocateWaterfall(dto.amount, invoices);

                    const created = await tx.payment.create({
                        data: {
                            studentId: dto.studentId,
                            amount: dto.amount,
                            method: dto.method,
                            reference: dto.reference,
                            recordedById,
                        },
                    });
                    for (const alloc of result.allocations) {
                        await tx.paymentAllocation.create({
                            data: {
                                paymentId: created.id,
                                invoiceId: alloc.invoiceId,
                                amount: alloc.amount,
                            },
                        });
                    }
                    for (const st of result.statuses) {
                        await tx.invoice.update({
                            where: { id: st.invoiceId },
                            data: { status: st.status },
                        });
                    }

                    return {
                        paymentId: created.id,
                        allocated: result.allocations,
                        statuses: result.statuses,
                    };
                });
            } catch (err) {
                const retryable = isRetryableWriteConflict(err);
                if (!retryable || attempt >= PAYMENT_MAX_ATTEMPTS) throw err;
            }
        }
    }

    /** Invoices with their allocated totals, shaped for the waterfall. */
    private async invoiceSnapshot(
        db: Pick<DatabaseService, 'invoice'>,
        where: { studentId: string } | { id: { in: string[] } },
    ): Promise<InvoiceLike[]> {
        const invoices = await db.invoice.findMany({
            where,
            include: { allocations: true },
            orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
        });
        return invoices.map((inv) => ({
            id: inv.id,
            amount: inv.amount,
            dueDate: inv.dueDate,
            allocated: inv.allocations.reduce((s, a) => s + a.amount, 0),
        }));
    }
}

/** Whole-transaction retries for concurrent payment conflicts (Q-0004). */
const PAYMENT_MAX_ATTEMPTS = 3;

/** Prisma write conflict, Postgres serialization failure, deadlock. */
const RETRYABLE_WRITE_CODES = ['P2034', '40001', '40P01'];

function isRetryableWriteConflict(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false;
    const e = err as {
        code?: unknown;
        meta?: { code?: unknown };
        cause?: { code?: unknown; originalCode?: unknown };
    };
    return [e.code, e.meta?.code, e.cause?.code, e.cause?.originalCode].some(
        (code) => typeof code === 'string' && RETRYABLE_WRITE_CODES.includes(code),
    );
}
