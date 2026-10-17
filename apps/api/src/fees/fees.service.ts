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

        const students = await this.prisma.student.findMany({
            where: {
                status: 'ACTIVE',
                ...(dto.classId
                    ? { OR: [{ classId: dto.classId }, { class: { id: dto.classId } }] }
                    : {}),
            },
        });
        if (students.length === 0) throw new BadRequestException('No students matched');

        const dueDate = new Date(dto.dueDate);
        const result = await this.prisma.$transaction(
            students.map((s) =>
                this.prisma.invoice.create({
                    data: {
                        studentId: s.id,
                        feeHeadId: head.id,
                        amount: head.amount,
                        dueDate,
                    },
                }),
            ),
        );
        return { created: result.length, amount: head.amount };
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

        const invoices = await this.prisma.invoice.findMany({
            where: { studentId: dto.studentId },
            include: { allocations: true },
        });

        const asInvoiceLike: InvoiceLike[] = invoices.map((inv) => ({
            id: inv.id,
            amount: inv.amount,
            dueDate: inv.dueDate,
            allocated: inv.allocations.reduce((s, a) => s + a.amount, 0),
        }));

        const totalOutstanding = asInvoiceLike.reduce((s, i) => s + outstanding(i), 0);
        if (dto.amount > totalOutstanding) {
            throw new BadRequestException(
                `Payment ${dto.amount} exceeds outstanding balance ${totalOutstanding}`,
            );
        }

        const result = allocateWaterfall(dto.amount, asInvoiceLike);

        const payment = await this.prisma.$transaction(async (tx) => {
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
            return created;
        });

        return {
            paymentId: payment.id,
            allocated: result.allocations,
            statuses: result.statuses,
        };
    }
}
