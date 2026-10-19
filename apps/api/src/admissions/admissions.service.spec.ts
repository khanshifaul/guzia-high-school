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
        siteSetting: {
            findUnique: async () =>
                ({ id: 'singleton', admissionTypes: 'day,residential', shifts: 'Morning,Afternoon' }),
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
        sendAdmissionReceived: async (payload: { to: string; studentName: string }) => {
            state.emails.push(payload);
            return true;
        },
    };

    const config = { get: () => undefined };
    const upload = {
        storeFile: async () => ({
            key: 'admissions/photo.png',
            url: '/api/files/admissions/photo.png',
            size: 1,
            contentType: 'image/png',
            storage: 'local',
        }),
    };

    return new AdmissionsService(prisma as never, email as never, config as never, upload as never);
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

    it('returns an application number, never credentials the account cannot use', async () => {
        const state = baseState();
        const service = buildService(state);
        const receipt = await service.submit({ ...APPLICANT });

        expect(receipt.studentName).toBe('Ayesha Rahman');
        expect(receipt.classWanted).toBe('Class 8');
        expect(receipt.id).toBeTruthy();
        // The account is BLOCKED until an admin approves it, so a password
        // printed at submit time could never be used to log in.
        expect(receipt).not.toHaveProperty('password');
        expect(receipt).not.toHaveProperty('username');
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

/** A PNG header carrying the given dimensions — enough for the size check. */
function pngBuffer(width: number, height: number): Buffer {
    const buffer = Buffer.alloc(24);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
    buffer.writeUInt32BE(13, 8);
    buffer.write('IHDR', 12, 'ascii');
    buffer.writeUInt32BE(width, 16);
    buffer.writeUInt32BE(height, 20);
    return buffer;
}

describe('AdmissionsService.storeAttachment', () => {
    it('accepts a 300x300 photo under 1 MB', async () => {
        const service = buildService(baseState());
        const file = { buffer: pngBuffer(300, 300), originalname: 'p.png', mimetype: 'image/png' };
        await expect(service.storeAttachment(file, 'photo')).resolves.toBeTruthy();
    });

    it('refuses a photo that is not exactly 300x300', async () => {
        const service = buildService(baseState());
        const file = { buffer: pngBuffer(400, 400), originalname: 'p.png', mimetype: 'image/png' };
        await expect(service.storeAttachment(file, 'photo')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses a photo larger than 1 MB', async () => {
        const service = buildService(baseState());
        const big = Buffer.concat([pngBuffer(300, 300), Buffer.alloc(1024 * 1024)]);
        await expect(
            service.storeAttachment({ buffer: big, originalname: 'p.png', mimetype: 'image/png' }, 'photo'),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('does not apply the photo rule to a birth certificate', async () => {
        const service = buildService(baseState());
        const file = { buffer: pngBuffer(800, 600), originalname: 'bc.png', mimetype: 'image/png' };
        await expect(service.storeAttachment(file, 'birthCert')).resolves.toBeTruthy();
    });

    it('refuses a request with no file', async () => {
        const service = buildService(baseState());
        await expect(service.storeAttachment(undefined, 'photo')).rejects.toBeInstanceOf(BadRequestException);
    });
});

describe('AdmissionsService.submit — the site settings gate what is offered', () => {
    it('refuses an admission type the school does not offer', async () => {
        const state = baseState();
        const service = buildService(state);
        // The fake settings offer only day + residential; "boarding" is unknown.
        await expect(
            service.submit({ ...APPLICANT, admissionType: 'boarding' } as never),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(state.applications).toHaveLength(0);
    });

    it('refuses a shift the school does not run', async () => {
        const state = baseState();
        const service = buildService(state);
        await expect(service.submit({ ...APPLICANT, shift: 'Night' })).rejects.toBeInstanceOf(
            BadRequestException,
        );
        expect(state.applications).toHaveLength(0);
    });

    it('accepts a configured shift', async () => {
        const state = baseState();
        const service = buildService(state);
        await service.submit({ ...APPLICANT, shift: 'Morning' });
        expect(state.applications).toHaveLength(1);
    });
});
