// test/fees.e2e-spec.ts — fee payments and invoice generation against a real
// Postgres (OPEN-QUESTIONS Q-0004 / Q-0005). Run the API on the compose
// database first, then: DATABASE_URL=… bun --filter @guzia/api test:e2e
import request from 'supertest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client';

const API = process.env.API_URL ?? 'http://localhost:4000';
const ADMIN = { email: 'admin@guziahs.edu', password: 'password123' };

/**
 * This suite writes fixtures and removes them. It refuses to run against a
 * database that is not on this machine, so a mis-set DATABASE_URL can never
 * put an e2e fixture into a remote database.
 */
function localDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required: refusing to write e2e fixtures without it');
  }
  const host = new URL(url).hostname;
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(host)) {
    throw new Error(`refusing to write e2e fixtures: DATABASE_URL host "${host}" is not local`);
  }
  return url;
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: localDatabaseUrl() }),
});

const tag = `${Date.now()}-${process.pid}`;
let classId: string | undefined;
let studentId: string | undefined;
let feeHeadId: string | undefined;
let cookie: string[] | undefined;

const generate = (dueDate: string) =>
  request(API)
    .post('/api/fees/invoices/generate')
    .set('Cookie', cookie ?? [])
    .send({ feeHeadId, classId, dueDate });

const pay = (amount: number) =>
  request(API)
    .post('/api/fees/payments')
    .set('Cookie', cookie ?? [])
    .send({ studentId, amount, method: 'CASH' });

function allocatedIn(response: { body: unknown }): number {
  const body = response.body as { allocated?: { amount: number }[] };
  return (body.allocated ?? []).reduce((sum, a) => sum + a.amount, 0);
}

describe('Fees: payment allocation and invoice generation (e2e)', () => {
  beforeAll(async () => {
    const cls = await prisma.class.create({ data: { name: `E2E-FEES-${tag}` } });
    classId = cls.id;

    const student = await prisma.student.create({
      data: {
        admissionNo: `E2E-${tag}`,
        fullName: 'E2E Fees Student',
        classId,
        rollNo: 1,
        status: 'ACTIVE',
      },
    });
    studentId = student.id;

    const head = await prisma.feeHead.create({
      data: { name: `E2E-FEES-HEAD-${tag}`, amount: 1200, classId },
    });
    feeHeadId = head.id;

    const login = await request(API).post('/api/auth/login').send(ADMIN);
    expect(login.status).toBe(200);
    cookie = login.headers['set-cookie'] as unknown as string[];
    expect(cookie?.length).toBeGreaterThan(0);
  });

  afterAll(async () => {
    if (studentId) {
      await prisma.payment.deleteMany({ where: { studentId } });
      await prisma.invoice.deleteMany({ where: { studentId } });
      await prisma.student.deleteMany({ where: { id: studentId } });
    }
    if (feeHeadId) await prisma.feeHead.deleteMany({ where: { id: feeHeadId } });
    if (classId) await prisma.class.deleteMany({ where: { id: classId } });
    await prisma.$disconnect();
  });

  it('never allocates more than the invoice amount when two payments race', async () => {
    const created = await generate('2026-12-01');
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ created: 1, amount: 1200 });

    const invoice = await prisma.invoice.findFirstOrThrow({
      where: { studentId, feeHeadId },
    });

    const responses = await Promise.all([pay(invoice.amount), pay(invoice.amount)]);
    const accepted = responses.filter((r) => r.status === 201);
    const rejected = responses.filter((r) => r.status === 400);

    // Each call either fully allocates its amount or is rejected loudly.
    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(allocatedIn(accepted[0])).toBe(invoice.amount);

    const allocated = await prisma.paymentAllocation.aggregate({
      where: { invoiceId: invoice.id },
      _sum: { amount: true },
    });
    expect(allocated._sum.amount).toBe(invoice.amount);
    expect(allocated._sum.amount ?? 0).toBeLessThanOrEqual(invoice.amount);

    const stored = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(stored.status).toBe('PAID');
  });

  it('generates no new rows for the same fee head and due date', async () => {
    const countBefore = await prisma.invoice.count({ where: { studentId, feeHeadId } });

    const again = await generate('2026-12-01');
    expect(again.status).toBe(201);
    expect(again.body).toMatchObject({ created: 0, skipped: 1, amount: 1200 });

    expect(await prisma.invoice.count({ where: { studentId, feeHeadId } })).toBe(countBefore);

    const installment = await generate('2026-12-15');
    expect(installment.status).toBe(201);
    expect(installment.body).toMatchObject({ created: 1, skipped: 0 });
    expect(await prisma.invoice.count({ where: { studentId, feeHeadId } })).toBe(countBefore + 1);
  });

  it('rejects a payment that exceeds the outstanding balance', async () => {
    const invoice = await prisma.invoice.findFirstOrThrow({
      where: { studentId, feeHeadId, dueDate: new Date('2026-12-15') },
    });

    const response = await pay(invoice.amount + 1);
    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).toContain('exceeds outstanding balance');

    const payments = await prisma.payment.count({ where: { studentId } });
    expect(payments).toBe(1); // only the accepted payment from the race test
  });
});
