// test/admissions.e2e-spec.ts — end-to-end admission workflow: submit →
// admin queue → approve (enrolls student) → new student can log in.
// Run the API first (bun run dev), then: bun run test:e2e
import request from 'supertest';

const API = process.env.API_URL ?? 'http://localhost:4000';

describe('Admissions workflow (e2e)', () => {
  it('submits a public application, admin approves it, and the new student can log in', async () => {
    // Unique email so the test is re-runnable.
    const email = `e2e-applicant-${Date.now()}@example.com`;

    // 1. Public submit (no auth).
    const submit = await request(API).post('/api/admissions').send({
      studentName: 'E2E Applicant',
      guardianName: 'E2E Guardian',
      phone: '01799999999',
      email,
      classWanted: 'Class 6',
    });
    expect(submit.status).toBe(201);
    const applicationId = submit.body.id as string;
    expect(applicationId).toBeTruthy();
    // The pending account is BLOCKED, so no password is issued at submit time.
    expect(submit.body.password).toBeUndefined();

    // 2. Admin login + review (approve) — activates the pending account.
    const admin = await request(API)
      .post('/api/auth/login')
      .send({ email: 'admin@guziahs.edu', password: 'password123' });
    const adminCookie = admin.headers['set-cookie'] as unknown as string[];

    const review = await request(API)
      .post(`/api/admissions/${applicationId}/review`)
      .set('Cookie', adminCookie)
      .send({ decision: 'APPROVED', note: 'e2e test' });
    expect(review.status).toBe(201);
    expect(review.body.status).toBe('APPROVED');
    expect(review.body.admissionNo).toMatch(/^GHS-\d{4}-\d{3}$/);
    // Approval activates the account and returns the one-time credentials.
    const password = review.body.generatedPassword as string;
    expect(password).toBeTruthy();

    // 3. Those credentials work once the account is approved.
    const studentLogin = await request(API)
      .post('/api/auth/login')
      .send({ email, password });
    expect(studentLogin.status).toBe(200);
    expect(studentLogin.body.data.user.role).toBe('STUDENT');
  });

  it('rejects re-reviewing an already-reviewed application with 409', async () => {
    const submit = await request(API).post('/api/admissions').send({
      studentName: 'E2E Twice',
      guardianName: 'Guardian',
      phone: '01788888888',
      email: `e2e-twice-${Date.now()}@example.com`,
      classWanted: 'Class 6',
    });
    const id = submit.body.id as string;

    const admin = await request(API)
      .post('/api/auth/login')
      .send({ email: 'admin@guziahs.edu', password: 'password123' });
    const adminCookie = admin.headers['set-cookie'] as unknown as string[];

    const first = await request(API)
      .post(`/api/admissions/${id}/review`)
      .set('Cookie', adminCookie)
      .send({ decision: 'REJECTED', note: 'first' });
    expect(first.status).toBe(201);

    const second = await request(API)
      .post(`/api/admissions/${id}/review`)
      .set('Cookie', adminCookie)
      .send({ decision: 'APPROVED' });
    expect(second.status).toBe(409);
  });
});
