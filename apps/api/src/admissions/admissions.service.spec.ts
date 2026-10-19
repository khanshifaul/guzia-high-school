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

    describe('the derived age', () => {
        // The age depends on today's date, so the clock is pinned: on
        // 20 October 2026 the applicant born 12 May 2014 is 12.
        const DOB = '2014-05-12';
        const TODAY = new Date(2026, 9, 20, 12, 0, 0);

        beforeEach(() => {
            jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
            jest.setSystemTime(TODAY);
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('stores the age derived from the date of birth', async () => {
            const state = baseState();
            const service = buildService(state);
            await service.submit({ ...APPLICANT, dateOfBirth: DOB });

            expect(state.applications[0].formData.age).toBe(12);
        });

        it('ignores an age the client tried to send, and stores its own', async () => {
            const state = baseState();
            const service = buildService(state);
            // A client that sends a stale or forged age must not be believed.
            await service.submit({
                ...APPLICANT,
                dateOfBirth: DOB,
                age: 99,
            } as never);

            expect(state.applications[0].formData.age).toBe(12);
        });

        it('stores no age when there is no date of birth', async () => {
            const state = baseState();
            const service = buildService(state);
            await service.submit({ ...APPLICANT });

            expect(state.applications[0].formData).not.toHaveProperty('age');
        });

        it('refuses a date of birth outside the admission age window', async () => {
            const state = baseState();
            const service = buildService(state);
            // A 40-year-old is not a school applicant — a data-entry slip.
            await expect(
                service.submit({ ...APPLICANT, dateOfBirth: '1985-01-01' }),
            ).rejects.toBeInstanceOf(BadRequestException);
            expect(state.users).toHaveLength(0);
            expect(state.applications).toHaveLength(0);
        });
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
