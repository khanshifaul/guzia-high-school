// src/ai/llm/llm.service.spec.ts — mock fixtures, key truth, timeouts, retry
// policy, error mapping, truncation and the JSON repair contract.
//
// The OpenAI SDK is mocked: no test opens a socket, touches a DB or reads a
// provider row. The stubbed client is the only "network" in this file.
import {
    ServiceUnavailableException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { OpenAI } from 'openai';
import { LlmService } from './llm.service';
import { DatabaseService } from '../../database/database.service';
import { encrypt } from './crypto.util';

jest.mock('openai', () => ({ OpenAI: jest.fn() }));

const OpenAIMock = OpenAI as unknown as jest.Mock;
const SECRET = 'test-secret-0123456789';

let create: jest.Mock;

beforeAll(() => {
    process.env.AI_CONFIG_SECRET = SECRET;
});

afterAll(() => {
    delete process.env.AI_CONFIG_SECRET;
});

beforeEach(() => {
    create = jest.fn();
    OpenAIMock.mockReset();
    OpenAIMock.mockImplementation(() => ({ chat: { completions: { create } } }));
});

afterEach(() => {
    jest.useRealTimers();
});

interface ProviderRow {
    id: string;
    name: string;
    baseUrl: string;
    textModel: string;
    visionModel: string | null;
    apiKeyEnc: string | null;
    apiKeyHint: string | null;
    temperature: number;
    maxTokens: number;
    enabled: boolean;
    updatedById: string | null;
    createdAt: Date;
    updatedAt: Date;
}

/** A singleton provider row with a real encrypted key by default. */
function providerRow(overrides: Partial<ProviderRow> = {}): ProviderRow {
    return {
        id: 'singleton',
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        textModel: 'deepseek-chat',
        visionModel: null,
        apiKeyEnc: encrypt('sk-test', SECRET),
        apiKeyHint: null,
        temperature: 0.3,
        maxTokens: 2048,
        enabled: true,
        updatedById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

function serviceWith(
    row: ProviderRow | null,
    env: Record<string, unknown> = {},
): LlmService {
    const prisma = {
        aiProviderConfig: { findUnique: async () => row },
    } as unknown as DatabaseService;
    const config = {
        get: (key: string) => env[key],
    } as unknown as ConfigService;
    return new LlmService(prisma, config);
}

/** A ChatCompletion-shaped reply. */
function reply(
    content: string,
    finishReason = 'stop',
    usage?: { prompt_tokens: number; completion_tokens: number },
) {
    return { choices: [{ message: { content }, finish_reason: finishReason }], usage };
}

const opts = { system: 'system prompt', user: 'user prompt' };

describe('LlmService provider health', () => {
    it('reports the resolved DB provider without secrets', async () => {
        const health = await serviceWith(providerRow()).health();
        expect(health).toMatchObject({
            configured: true,
            source: 'db',
            model: 'deepseek-chat',
            keyPresent: true,
        });
        expect(JSON.stringify(health)).not.toContain('sk-test');
    });
});

describe('LlmService error mapping and retry policy', () => {
    it('maps a 401 to a 503 without retrying, and never echoes the key', async () => {
        create.mockRejectedValue(
            Object.assign(new Error('401 Unauthorized: Incorrect API key provided: sk-test'), {
                status: 401,
            }),
        );
        const service = serviceWith(providerRow());

        const error = await service.complete(opts).catch((err) => err);

        expect(error).toBeInstanceOf(ServiceUnavailableException);
        expect(error.message).toContain('provider DeepSeek rejected the key');
        expect(error.message).toContain('model deepseek-chat');
        expect(error.message).not.toContain('sk-test');
        expect(create).toHaveBeenCalledTimes(1);
        expect(OpenAIMock.mock.calls[0][0]).toMatchObject({
            timeout: 30_000,
            maxRetries: 0,
        });
    });

    it('times out at 30s with no retry', async () => {
        jest.useFakeTimers();
        create.mockImplementation(
            (_body: unknown, options?: { signal?: AbortSignal }) =>
                new Promise((_resolve, reject) => {
                    options?.signal?.addEventListener('abort', () => {
                        reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
                    });
                }),
        );
        const service = serviceWith(providerRow());

        const result = service.complete(opts).catch((err) => err);
        await jest.runAllTimersAsync();
        const error = await result;

        expect(error).toBeInstanceOf(ServiceUnavailableException);
        expect(error.message).toContain('timed out after 30s');
        expect(create).toHaveBeenCalledTimes(1);
    });

    it('retries a 429 exactly once, honoring Retry-After, then 503s', async () => {
        create.mockRejectedValue(
            Object.assign(new Error('rate limited'), {
                status: 429,
                headers: { 'retry-after': '0' },
            }),
        );
        const service = serviceWith(providerRow());

        const error = await service.complete(opts).catch((err) => err);

        expect(error).toBeInstanceOf(ServiceUnavailableException);
        expect(error.message).toContain('rate-limited the request');
        expect(create).toHaveBeenCalledTimes(2);
    });

    it('retries a 5xx exactly once, then 503s', async () => {
        jest.useFakeTimers();
        create.mockRejectedValue(Object.assign(new Error('bad gateway'), { status: 502 }));
        const service = serviceWith(providerRow());

        const result = service.complete(opts).catch((err) => err);
        await jest.runAllTimersAsync();
        const error = await result;

        expect(error).toBeInstanceOf(ServiceUnavailableException);
        expect(error.message).toContain('returned HTTP 502');
        expect(create).toHaveBeenCalledTimes(2);
    });

    it('retries a network failure exactly once, then 503s', async () => {
        jest.useFakeTimers();
        create.mockRejectedValue(new TypeError('fetch failed'));
        const service = serviceWith(providerRow());

        const result = service.complete(opts).catch((err) => err);
        await jest.runAllTimersAsync();
        const error = await result;

        expect(error).toBeInstanceOf(ServiceUnavailableException);
        expect(error.message).toContain('is unreachable');
        expect(create).toHaveBeenCalledTimes(2);
    });

    it('raises an explicit truncation error for finish_reason=length', async () => {
        create.mockResolvedValue(reply('{"a":1}', 'length', { prompt_tokens: 10, completion_tokens: 5 }));
        const service = serviceWith(providerRow());

        const error = await service.complete({ ...opts, json: true }).catch((err) => err);

        expect(error).toBeInstanceOf(UnprocessableEntityException);
        expect(error.message).toContain('response truncated by max_tokens');
        expect(create).toHaveBeenCalledTimes(1);
    });
});

describe('LlmService key truth', () => {
    it('passes the decrypted key when apiKeyEnc is set and apiKeyHint is null', async () => {
        create.mockResolvedValue(reply('ok'));
        const service = serviceWith(providerRow({ apiKeyHint: null }));

        await expect(service.complete(opts)).resolves.toBe('ok');
        expect(OpenAIMock.mock.calls[0][0].apiKey).toBe('sk-test');
        expect(OpenAIMock.mock.calls[0][0].apiKey).not.toBe('missing-key');
    });

    it('rejects a keyless public provider before any client or network call', async () => {
        const service = serviceWith(
            providerRow({ apiKeyEnc: null, apiKeyHint: 'sk-…masked' }),
        );

        const error = await service.complete(opts).catch((err) => err);

        expect(error).toBeInstanceOf(ServiceUnavailableException);
        expect(error.message).toContain('provider DeepSeek has no API key');
        expect(error.message).toContain('admin must set it');
        expect(OpenAIMock).not.toHaveBeenCalled();
        expect(create).not.toHaveBeenCalled();
    });

    it('accepts a keyless loopback provider with a placeholder key', async () => {
        create.mockResolvedValue(reply('local reply'));
        const service = serviceWith(
            providerRow({
                baseUrl: 'http://localhost:11434/v1',
                apiKeyEnc: null,
                apiKeyHint: null,
            }),
        );

        await expect(service.complete(opts)).resolves.toBe('local reply');
        expect(OpenAIMock.mock.calls[0][0]).toMatchObject({
            apiKey: 'keyless-local-provider',
            baseURL: 'http://localhost:11434/v1',
        });
    });

    it('uses an env custom provider when no DB row exists', async () => {
        create.mockResolvedValue(reply('env reply'));
        const service = serviceWith(null, {
            AI_BASE_URL: 'http://127.0.0.1:8080/v1',
            AI_MODEL: 'local-model',
        });

        await expect(service.complete(opts)).resolves.toBe('env reply');
        expect(OpenAIMock.mock.calls[0][0]).toMatchObject({
            baseURL: 'http://127.0.0.1:8080/v1',
        });
        expect(create.mock.calls[0][0]).toMatchObject({ model: 'local-model' });
    });

    it('does not fall back when the env provider is half-configured', async () => {
        const service = serviceWith(null, { AI_PROVIDER: 'custom' });

        const error = await service.complete(opts).catch((err) => err);

        expect(error).toBeInstanceOf(ServiceUnavailableException);
        expect(error.message).toContain('AI_BASE_URL and AI_MODEL');
        expect(create).not.toHaveBeenCalled();
    });
});

describe('LlmService completeJson', () => {
    const schema = z.object({ name: z.string() });

    it('passes valid JSON through the zod schema', async () => {
        create.mockResolvedValue(reply('{"name":"ok"}'));
        const service = serviceWith(providerRow());

        await expect(service.completeJson({ ...opts, json: true }, schema)).resolves.toEqual({
            name: 'ok',
        });
        expect(create).toHaveBeenCalledTimes(1);
    });

    it('re-asks once with the validation error appended, then succeeds', async () => {
        create
            .mockResolvedValueOnce(reply('{"name": 42}'))
            .mockResolvedValueOnce(reply('{"name":"ok"}'));
        const service = serviceWith(providerRow());

        await expect(service.completeJson({ ...opts, json: true }, schema)).resolves.toEqual({
            name: 'ok',
        });

        expect(create).toHaveBeenCalledTimes(2);
        const firstMessages = create.mock.calls[0][0].messages as { content: string }[];
        const repairMessages = create.mock.calls[1][0].messages as { content: string }[];
        expect(firstMessages[0].content).toBe(opts.system);
        expect(repairMessages[0].content).toBe(opts.system);
        expect(repairMessages.at(-1)?.content).toContain('previous reply was invalid');
        expect(repairMessages.at(-1)?.content).toContain('schema mismatch');
    });

    it('raises a typed error when the repair also fails', async () => {
        create.mockResolvedValue(reply('{"name": 42}'));
        const service = serviceWith(providerRow());

        const error = await service
            .completeJson({ ...opts, json: true }, schema)
            .catch((err) => err);

        expect(error).toBeInstanceOf(UnprocessableEntityException);
        expect(error.message).toContain('after one repair attempt');
        expect(create).toHaveBeenCalledTimes(2);
    });

    it('treats a non-JSON reply as a validation failure and repairs it', async () => {
        create
            .mockResolvedValueOnce(reply('not json at all'))
            .mockResolvedValueOnce(reply('{"name":"ok"}'));
        const service = serviceWith(providerRow());

        await expect(service.completeJson({ ...opts, json: true }, schema)).resolves.toEqual({
            name: 'ok',
        });
        expect(create).toHaveBeenCalledTimes(2);
    });
});

describe('LlmService mock provider', () => {
    function serviceWithMockProvider(): LlmService {
        return serviceWith(
            providerRow({
                name: 'mock',
                baseUrl: '',
                textModel: 'mock',
                apiKeyEnc: null,
                apiKeyHint: null,
            }),
        );
    }

    it('sizes the paper fixture to the requested question mix', async () => {
        const raw = await serviceWithMockProvider().complete({
            system: 's',
            user: 'u',
            json: true,
            mockFixture: 'paper',
            mockCounts: { mcq: 10, short: 5, long: 3 },
        });
        const paper = JSON.parse(raw) as {
            groups: { type: string; questions: unknown[] }[];
        };
        const byType = (t: string) => paper.groups.find((g) => g.type === t)?.questions.length ?? 0;
        expect(byType('MCQ')).toBe(10);
        expect(byType('SHORT')).toBe(5);
        expect(byType('LONG')).toBe(3);
    });

    it('gives every MCQ exactly four options', async () => {
        const raw = await serviceWithMockProvider().complete({
            system: 's',
            user: 'u',
            json: true,
            mockFixture: 'paper',
            mockCounts: { mcq: 2, short: 1, long: 1 },
        });
        const paper = JSON.parse(raw) as {
            groups: { type: string; questions: { options?: string[] }[] }[];
        };
        const mcqs = paper.groups.find((g) => g.type === 'MCQ')!.questions;
        for (const q of mcqs) {
            expect(q.options).toHaveLength(4);
        }
    });

    it('omits groups the blueprint did not ask for', async () => {
        const raw = await serviceWithMockProvider().complete({
            system: 's',
            user: 'u',
            json: true,
            mockFixture: 'paper',
            mockCounts: { mcq: 1, short: 0, long: 0 },
        });
        const paper = JSON.parse(raw) as { groups: { type: string; questions: unknown[] }[] };
        expect(paper.groups.map((g) => g.type)).toEqual(['MCQ']);
    });

    it('sizes the plan fixture to the requested week count', async () => {
        const raw = await serviceWithMockProvider().complete({
            system: 's',
            user: 'u',
            json: true,
            mockFixture: 'plan',
            mockCounts: { weeks: 16 },
        });
        const plan = JSON.parse(raw) as { weeks: unknown[] };
        expect(plan.weeks).toHaveLength(16);
    });
});
