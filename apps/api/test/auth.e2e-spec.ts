// test/auth.e2e-spec.ts — end-to-end auth flow against a running API.
// Run the API first (bun run dev), then: bun run test:e2e
import request from 'supertest';

const API = process.env.API_URL ?? 'http://localhost:4000';

describe('Auth (e2e)', () => {
  it('health check reports database up', async () => {
    const res = await request(API).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.database).toBe('up');
  });

  it('rejects a wrong password with 401', async () => {
    const res = await request(API)
      .post('/api/auth/login')
      .send({ email: 'admin@guziahs.edu', password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('logs in as admin and returns a profile via /auth/me', async () => {
    const login = await request(API)
      .post('/api/auth/login')
      .send({ email: 'admin@guziahs.edu', password: 'password123' });
    expect(login.status).toBe(200);
    expect(login.body.data.user.role).toBe('ADMIN');

    // The cookie jar carries ghs_token; use it on /auth/me.
    const me = await request(API)
      .get('/api/auth/me')
      .set('Cookie', login.headers['set-cookie'] as unknown as string[]);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe('admin@guziahs.edu');
  });

  it('blocks an unauthenticated /students with 401', async () => {
    const res = await request(API).get('/api/students');
    expect(res.status).toBe(401);
  });

  it('blocks a student from the admin-only /students list with 403', async () => {
    const login = await request(API)
      .post('/api/auth/login')
      .send({ email: 'student01@guziahs.edu', password: 'password123' });
    const res = await request(API)
      .get('/api/students')
      .set('Cookie', login.headers['set-cookie'] as unknown as string[]);
    expect(res.status).toBe(403);
  });
});
