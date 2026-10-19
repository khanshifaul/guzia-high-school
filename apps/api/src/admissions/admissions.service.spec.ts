// src/admissions/admissions.service.spec.ts — protects the public submit path:
//   - the honeypot must reject a bot before anything is written,
//   - a duplicate email must not create a second account,
//   - the honeypot must never be persisted as part of the application,
//   - a successful submit returns the receipt the applicant needs to print
//     and log in.
import { BadRequestException, ConflictException } from '@nestjs/common';

import { AdmissionsService } from './admissions.service';

interface FakeState {
    users: { id: string; email: string }[];
    applications: { id: string; formData: Record<string, unknown>; status: string; userId: string }[];
    emails: { to: string; studentName: string }[];
    nextId: number;
}

function buildService(state: FakeState) {
    const prisma = {
        user: {
            findUnique: async ({ where }: { where: { email: string } }) =>
                state.users.find((u) => u.email === where.email) ?? null,
            create: async ({ data }: { data: { email: string; fullName: string } }) => {
                const user = { id: `user-${state.nextId}`, email: data.email };
                state.nextId += 1;
                state.users.push(user);
                return { ...user, fullName: data.fullName, role: 'STUDENT', status: 'BLOCKED' };
            },
            update: async () => ({}),
        },
        admissionApplication: {
            create: async ({ data }: { data: { formData: Record<string, unknown>; userId: string } }) => {
                const application = {
                    id: `app-${state.nextId}`,
                    formData: data.formData,
                    status: 'SUBMITTED',
                    userId: data.userId,
                };
                state.nextId += 1;
                state.applications.push(application);
                return application;
            },
        },
    };

    const email = {
        enabled: false,
        sendAdmissionCredentials: async (payload: { to: string; studentName: string }) => {
            state.emails.push(payload);
            return true;
        },
    };

    const config = { get: () => undefined };

    return new AdmissionsService(prisma as never, email as never, config as never);
}

function baseState(overrides: Partial<FakeState> = {}): FakeState {
    return { users: [], applications: [], emails: [], nextId: 1, ...overrides };
}

const APPLICANT = {
    studentName: 'Ayesha Rahman',
    guardianName: 'Karim Uddin',
    phone: '01712345678',
    email: 'ayesha@example.com',
    classWanted: 'Class 8',
    declarationAccepted: true,
};

describe('AdmissionsService.submit', () => {
    it('creates a blocked account and a submitted application', async () => {
        const state = baseState();
        const service = buildService(state);
        await service.submit({ ...APPLICANT });

        expect(state.users).toHaveLength(1);
        expect(state.applications).toHaveLength(1);
        expect(state.applications[0].status).toBe('SUBMITTED');
    });

    it('returns the receipt the applicant prints and logs in with', async () => {
        const state = baseState();
        const service = buildService(state);
        const receipt = await service.submit({ ...APPLICANT });

        expect(receipt.studentName).toBe('Ayesha Rahman');
        expect(receipt.classWanted).toBe('Class 8');
        expect(receipt.username).toBe('ayesha@example.com');
        expect(receipt.password).toBeTruthy();
        expect(receipt.id).toBeTruthy();
    });

    it('refuses a second application for the same email', async () => {
        const state = baseState({ users: [{ id: 'user-1', email: 'ayesha@example.com' }] });
        const service = buildService(state);
        await expect(service.submit({ ...APPLICANT })).rejects.toBeInstanceOf(ConflictException);
        expect(state.applications).toHaveLength(0);
    });

    describe('the honeypot', () => {
        it('rejects a filled honeypot without writing anything', async () => {
            const state = baseState();
            const service = buildService(state);
            await expect(
                service.submit({ ...APPLICANT, website: 'http://spam.example.com' }),
            ).rejects.toBeInstanceOf(BadRequestException);
            expect(state.users).toHaveLength(0);
            expect(state.applications).toHaveLength(0);
        });

        it('treats a whitespace-only honeypot as empty, so a stray space does not block an applicant', async () => {
            const state = baseState();
            const service = buildService(state);
            await expect(service.submit({ ...APPLICANT, website: '   ' })).resolves.toBeTruthy();
            expect(state.applications).toHaveLength(1);
        });

        it('accepts an empty honeypot', async () => {
            const state = baseState();
            const service = buildService(state);
            await expect(service.submit({ ...APPLICANT, website: '' })).resolves.toBeTruthy();
            expect(state.applications).toHaveLength(1);
        });

        it('does not persist the honeypot as part of the application', async () => {
            const state = baseState();
            const service = buildService(state);
            await service.submit({ ...APPLICANT, website: '' });
            expect(state.applications[0].formData).not.toHaveProperty('website');
        });
    });
});
