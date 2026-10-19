// src/ai/llm/llm.service.ts — LLM access with fallback chain:
//   1. DB AiProviderConfig row (admin-configured, encrypted key, 60s TTL cache)
//   2. KILO_* env fallback (real-life LLM via kilo.ai gateway, kilo-auto/free)
//   3. Mock provider (the provider row's name starts with "mock")
//   4. 503 ServiceUnavailable (nothing configured)
//
// Provider fallback keeps the demo green without a DB row and lets production
// run against the kilo gateway out of the box. All calls use JSON mode when
// requested and are retried once on transient failures.
import {
    Injectable,
    Logger,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../database/database.service';
import { OpenAI } from 'openai';
import { decrypt } from './crypto.util';
import type { AiProviderConfig } from 'prisma/generated/client';

export interface LlmImage {
    mime: string;
    /** Base64 (no data: prefix). */
    base64: string;
}

export interface LlmTurn {
    role: 'user' | 'assistant';
    content: string;
}

export interface LlmCompleteOpts {
    system: string;
    user: string;
    /** Ask the provider for a JSON object response (OpenAI json_object mode). */
    json?: boolean;
    maxTokens?: number;
    /** Use the vision model path (image inputs) instead of the text model. */
    vision?: boolean;
    /** Images attached to the user message (vision models only). */
    images?: LlmImage[];
    /** Prior conversation turns, oldest first, inserted before the user message. */
    history?: LlmTurn[];
    /** Which mock fixture to return when the mock provider is active. Callers
     *  declare intent explicitly — substring-sniffing the prompt is fragile. */
    mockFixture?: 'plan' | 'week' | 'paper' | 'summary' | 'flashcards' | 'mindmap' | 'ask';
    /** Sizes the mock fixture to the caller's requested counts so the
     *  offline demo satisfies the same shape validation as a real LLM reply. */
    mockCounts?: { weeks?: number; mcq?: number; short?: number; long?: number; cards?: number };
}

/** Transient HTTP/network statuses worth one retry (static lookup). */
const RETRYABLE_STATUS: Record<number, true> = {
    408: true,
    429: true,
    500: true,
    502: true,
    503: true,
    504: true,
};

const CACHE_TTL_MS = 60_000;

interface CachedConfig {
    config: AiProviderConfig;
    fetchedAt: number;
}

interface GatewayError extends Error {
    status?: number;
}

@Injectable()
export class LlmService {
    private readonly logger = new Logger(LlmService.name);
    private cache: CachedConfig | null = null;

    constructor(
        private readonly prisma: DatabaseService,
        private readonly configService: ConfigService,
    ) {}

    /** Force the next call to re-read config (called after admin saves). */
    invalidateCache(): void {
        this.cache = null;
    }

    /** Resolve the active provider config. DB row wins; null means none configured. */
    async getConfig(): Promise<AiProviderConfig | null> {
        if (this.cache && Date.now() - this.cache.fetchedAt < CACHE_TTL_MS) {
            return this.cache.config;
        }
        const config = await this.prisma.aiProviderConfig.findUnique({
            where: { id: 'singleton' },
        });
        if (!config) return null;
        if (!config.enabled) return null;
        this.cache = { config, fetchedAt: Date.now() };
        return config;
    }

    /** True when the Kilo gateway env fallback is fully configured. */
    private kiloConfigured(): boolean {
        const url = this.configService.get<string>('KILO_GATEWAY_URL');
        const token = this.configService.get<string>('KILO_API_TOKEN');
        return Boolean(url && token);
    }

    /**
     * Complete a prompt against the first available provider in the fallback
     * chain. Returns the raw text. JSON-mode callers should parse + validate
     * the result; a single retry is attempted on transient failures.
     */
    async complete(opts: LlmCompleteOpts): Promise<string> {
        const dbConfig = await this.getConfig();

        // Mock provider (DB row named "mock…") — deterministic, offline.
        if (dbConfig && dbConfig.name.toLowerCase().startsWith('mock')) {
            return this.mockComplete(opts);
        }

        // An admin-configured DB row WITH a stored key wins.
        if (dbConfig && dbConfig.apiKeyEnc) {
            return this.retry(() => this.openaiComplete(dbConfig, opts));
        }

        // Env fallback: no DB row, or a keyless placeholder row (post-seed).
        if (this.kiloConfigured()) {
            return this.retry(() => this.kiloComplete(opts));
        }

        // Keyless DB row, no env fallback — attempt anyway (fails clearly).
        if (dbConfig) {
            return this.retry(() => this.openaiComplete(dbConfig, opts));
        }

        throw new ServiceUnavailableException(
            'AI provider is not configured (no usable AiProviderConfig row and no KILO_* env).',
        );
    }

    /** OpenAI-compatible path against the admin-configured DB provider row. */
    private async openaiComplete(
        config: AiProviderConfig,
        opts: LlmCompleteOpts,
    ): Promise<string> {
        const model = opts.vision && config.visionModel ? config.visionModel : config.textModel;
        const client = new OpenAI({
            apiKey: config.apiKeyHint ? await this.decryptKey(config) : 'missing-key',
            baseURL: config.baseUrl,
        });

        const userContent = opts.images?.length
            ? [
                  { type: 'text' as const, text: opts.user },
                  ...opts.images.map((img) => ({
                      type: 'image_url' as const,
                      image_url: { url: `data:${img.mime};base64,${img.base64}` },
                  })),
              ]
            : opts.user;

        try {
            const response = await client.chat.completions.create({
                model,
                temperature: config.temperature,
                max_tokens: opts.maxTokens ?? config.maxTokens,
                ...(opts.json ? { response_format: { type: 'json_object' as const } } : {}),
                messages: [
                    { role: 'system', content: opts.system },
                    ...(opts.history ?? []),
                    { role: 'user', content: userContent },
                ],
            });
            return response.choices[0]?.message?.content ?? '';
        } catch (err) {
            this.logger.error(`LLM call failed: ${(err as Error).message}`);
            throw err;
        }
    }

    /** Kilo gateway fallback: POST {model, messages} with Bearer token. */
    private async kiloComplete(opts: LlmCompleteOpts): Promise<string> {
        const gatewayUrl = this.configService.get<string>('KILO_GATEWAY_URL')!;
        const token = this.configService.get<string>('KILO_API_TOKEN')!;
        const textModel = this.configService.get<string>('KILO_MODEL') ?? 'kilo-auto/free';
        const model = opts.vision
            ? this.configService.get<string>('KILO_VISION_MODEL') ?? textModel
            : textModel;

        const userContent = opts.images?.length
            ? [
                  { type: 'text', text: opts.user },
                  ...opts.images.map((img) => ({
                      type: 'image_url',
                      image_url: { url: `data:${img.mime};base64,${img.base64}` },
                  })),
              ]
            : opts.user;

        const body = {
            model,
            temperature: 0.3,
            max_tokens: opts.maxTokens ?? 2048,
            ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
            messages: [
                { role: 'system', content: opts.system },
                ...(opts.history ?? []),
                { role: 'user', content: userContent },
            ],
        };

        const res = await fetch(`${gatewayUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const text = await res.text().catch(() => '');
            const err = new Error(`Kilo gateway HTTP ${res.status}: ${text}`);
            (err as GatewayError).status = res.status;
            throw err;
        }

        const data = (await res.json()) as unknown;
        return extractKiloContent(data);
    }

    /** Run `fn`, retrying once on transient HTTP/network failures. */
    private async retry<T>(fn: () => Promise<T>): Promise<T> {
        let lastErr: unknown;
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                return await fn();
            } catch (err) {
                lastErr = err;
                if (!this.isRetryable(err)) throw err;
                this.logger.warn(
                    `LLM attempt ${attempt + 1} failed, retrying: ${(err as Error).message}`,
                );
            }
        }
        throw lastErr;
    }

    private isRetryable(err: unknown): boolean {
        const gatewayErr = err as GatewayError;
        if (gatewayErr && typeof gatewayErr.status === 'number') {
            return Object.prototype.hasOwnProperty.call(RETRYABLE_STATUS, gatewayErr.status);
        }
        const msg = (err as Error)?.message ?? '';
        return /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|socket hang up|Unexpected end/.test(msg);
    }

    /** Decrypt the stored key (AES-256-GCM) using AI_CONFIG_SECRET. */
    private async decryptKey(config: AiProviderConfig): Promise<string> {
        if (!config.apiKeyEnc) return '';
        return decrypt(config.apiKeyEnc);
    }

    /**
     * Deterministic mock: returns a fixture based on the prompt's JSON intent.
     * Keeps the generator contracts testable and the demo runnable offline.
     */
    private mockComplete(opts: LlmCompleteOpts): string {
        // The ask fixture is a plain-text answer (not JSON), so it is checked
        // before the JSON gate below.
        if (opts.mockFixture === 'ask') {
            // The mock answer cites the excerpts it was given, so the offline
            // demo shows the same page-cited shape a real LLM produces. Both
            // citation forms are recognised: "[file p.N]" (notebook) and
            // "[p.N]" (single document).
            const cites = [...opts.user.matchAll(/\[([^\]]+?)\s+p\.([^\]]+?)\]/g)].map(
                (m) => `[${m[1]} p.${m[2]}]`,
            );
            const docCites = [...opts.user.matchAll(/\[p\.([^\]]+?)\]/g)].map((m) => `[p.${m[1]}]`);
            const unique = [...new Set([...cites, ...docCites])];
            return unique.length
                ? `Mock answer based on the retrieved excerpts. ${unique.join(' ')}`
                : 'Mock answer (no excerpts were retrieved).';
        }
        if (!opts.json) {
            return 'This is a mocked AI response (mock provider).';
        }
        // Explicit intent from the caller (substring-sniffing proved fragile —
        // "question-paper" contains "plan"). Fall back to summary.
        if (opts.mockFixture === 'plan') {
            const weeks = opts.mockCounts?.weeks ?? 12;
            return JSON.stringify({
                title: 'Mock Year Plan',
                weeks: Array.from({ length: weeks }, (_, i) => ({
                    week: i + 1,
                    topics: [`Topic ${i + 1}a`, `Topic ${i + 1}b`],
                    objective: `Objective for week ${i + 1}`,
                    assessment: i % 4 === 3 ? 'Quiz' : null,
                })),
            });
        }
        if (opts.mockFixture === 'week') {
            return JSON.stringify({
                topics: ['Topic a', 'Topic b'],
                objective: 'Objective for the regenerated week',
                assessment: null,
            });
        }
        if (opts.mockFixture === 'paper') {
            const mcq = opts.mockCounts?.mcq ?? 3;
            const short = opts.mockCounts?.short ?? 1;
            const long = opts.mockCounts?.long ?? 1;
            const groups = [
                {
                    type: 'MCQ',
                    questions: Array.from({ length: mcq }, (_, i) => ({
                        text: `MCQ ${i + 1}?`,
                        options: ['A', 'B', 'C', 'D'],
                        answer: 'A',
                        explanation: 'Because A.',
                        difficulty: i === 0 ? 'easy' : 'medium',
                    })),
                },
                {
                    type: 'SHORT',
                    questions: Array.from({ length: short }, (_, i) => ({
                        text: `Short Q${i + 1}?`,
                        answer: 'Answer.',
                        difficulty: 'medium',
                    })),
                },
                {
                    type: 'LONG',
                    questions: Array.from({ length: long }, (_, i) => ({
                        text: `Long Q${i + 1}?`,
                        answer: 'Answer.',
                        difficulty: 'hard',
                    })),
                },
            ];
            // A group with no questions fails the paper schema (min 1), so drop
            // the groups the blueprint did not ask for.
            return JSON.stringify({
                title: 'Mock Test Paper',
                groups: groups.filter((g) => g.questions.length > 0),
            });
        }
        if (opts.mockFixture === 'flashcards') {
            const cards = opts.mockCounts?.cards ?? 8;
            return JSON.stringify({
                cards: Array.from({ length: cards }, (_, i) => ({
                    front: `Mock question ${i + 1}?`,
                    back: `Mock answer ${i + 1}.`,
                })),
            });
        }
        if (opts.mockFixture === 'mindmap') {
            return JSON.stringify({
                root: 'Mock topic',
                branches: Array.from({ length: 4 }, (_, i) => ({
                    title: `Branch ${i + 1}`,
                    children: [`Point ${i + 1}a`, `Point ${i + 1}b`],
                })),
            });
        }
        // Default: a summary-ish JSON.
        return JSON.stringify({
            summary: 'Mock summary of the uploaded source.',
            keyTopics: ['Topic A', 'Topic B'],
            glossary: [{ term: 'Term', definition: 'Definition.' }],
            suggestedQuestions: ['Q1?', 'Q2?', 'Q3?'],
        });
    }
}

/** Safely extract content from the Kilo gateway JSON response. */
function extractKiloContent(data: unknown): string {
    if (!data || typeof data !== 'object') return '';
    const obj = data as { choices?: unknown };
    const choices = obj.choices;
    if (!Array.isArray(choices) || choices.length === 0) return '';
    const first = choices[0];
    if (!first || typeof first !== 'object') return '';
    const choice = first as { message?: unknown };
    const message = choice.message;
    if (!message || typeof message !== 'object') return '';
    const msg = message as { content?: unknown };
    const content = msg.content;
    return typeof content === 'string' ? content : '';
}
