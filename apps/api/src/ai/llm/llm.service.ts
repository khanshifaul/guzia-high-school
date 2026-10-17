// src/ai/llm/llm.service.ts — admin-configured, OpenAI-compatible LLM access
// (specs/10). Reads AiProviderConfig (DB row, 60s TTL cache), builds an
// OpenAI SDK client against whatever base URL the admin set, and forces JSON
// mode for generators. One mock provider keeps tests + offline demo green.
import {
    Injectable,
    Logger,
    ServiceUnavailableException,
    BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AiProviderConfig } from 'prisma/generated/client';

export interface LlmCompleteOpts {
    system: string;
    user: string;
    /** Ask the provider for a JSON object response (OpenAI json_object mode). */
    json?: boolean;
    maxTokens?: number;
    /** Use the vision model path (image inputs) instead of the text model. */
    vision?: boolean;
    /** Which mock fixture to return when the mock provider is active. Callers
     *  declare intent explicitly — substring-sniffing the prompt is fragile. */
    mockFixture?: 'plan' | 'paper' | 'summary';
}

/** In-memory cache so we don't hit the DB on every generation. */
interface CachedConfig {
    config: AiProviderConfig;
    fetchedAt: number;
}

const CACHE_TTL_MS = 60_000;

@Injectable()
export class LlmService {
    private readonly logger = new Logger(LlmService.name);
    private cache: CachedConfig | null = null;

    constructor(private readonly prisma: DatabaseService) {}

    /** Force the next call to re-read config (called after admin saves). */
    invalidateCache(): void {
        this.cache = null;
    }

    async getConfig(): Promise<AiProviderConfig> {
        if (this.cache && Date.now() - this.cache.fetchedAt < CACHE_TTL_MS) {
            return this.cache.config;
        }
        const config = await this.prisma.aiProviderConfig.findUnique({
            where: { id: 'singleton' },
        });
        if (!config) {
            throw new ServiceUnavailableException(
                'AI provider is not configured (no AiProviderConfig row). Set it in admin settings.',
            );
        }
        if (!config.enabled) {
            throw new ServiceUnavailableException(
                'AI provider is disabled by the administrator.',
            );
        }
        this.cache = { config, fetchedAt: Date.now() };
        return config;
    }

    /**
     * Complete a prompt against the configured OpenAI-compatible provider.
     * Returns the raw text. JSON-mode callers should parse + validate the
     * result; parse failures are the caller's concern (one retry lives in the
     * toolkit services).
     */
    async complete(opts: LlmCompleteOpts): Promise<string> {
        const config = await this.getConfig();

        // Mock provider (AI_MOCK=true or name starts with "mock"): deterministic
        // canned reply so tests + offline demo never hit the network.
        if (config.name.toLowerCase().startsWith('mock')) {
            return this.mockComplete(opts);
        }

        const model = opts.vision && config.visionModel ? config.visionModel : config.textModel;
        const { OpenAI } = await import('openai');
        const client = new OpenAI({
            apiKey: config.apiKeyHint ? await this.decryptKey(config) : 'missing-key',
            baseURL: config.baseUrl,
        });

        try {
            const response = await client.chat.completions.create({
                model,
                temperature: config.temperature,
                max_tokens: opts.maxTokens ?? config.maxTokens,
                ...(opts.json ? { response_format: { type: 'json_object' as const } } : {}),
                messages: [
                    { role: 'system', content: opts.system },
                    { role: 'user', content: opts.user },
                ],
            });
            return response.choices[0]?.message?.content ?? '';
        } catch (err) {
            this.logger.error(`LLM call failed: ${(err as Error).message}`);
            throw new ServiceUnavailableException(
                `AI provider request failed: ${(err as Error).message}`,
            );
        }
    }

    /** Decrypt the stored key (AES-256-GCM) using AI_CONFIG_SECRET. */
    private async decryptKey(config: AiProviderConfig): Promise<string> {
        const { decrypt } = await import('./crypto.util');
        if (!config.apiKeyEnc) return '';
        return decrypt(config.apiKeyEnc);
    }

    /**
     * Deterministic mock: returns a fixture based on the prompt's JSON intent.
     * Keeps the generator contracts testable and the demo runnable offline.
     */
    private mockComplete(opts: LlmCompleteOpts): string {
        if (!opts.json) {
            return 'This is a mocked AI response (AI_MOCK provider).';
        }
        // Explicit intent from the caller (substring-sniffing proved fragile —
        // "question-paper" contains "plan"). Fall back to summary.
        if (opts.mockFixture === 'plan') {
            return JSON.stringify({
                title: 'Mock Year Plan',
                weeks: Array.from({ length: 12 }, (_, i) => ({
                    week: i + 1,
                    topics: [`Topic ${i + 1}a`, `Topic ${i + 1}b`],
                    objective: `Objective for week ${i + 1}`,
                    assessment: i % 4 === 3 ? 'Quiz' : null,
                })),
            });
        }
        if (opts.mockFixture === 'paper') {
            return JSON.stringify({
                title: 'Mock Test Paper',
                groups: [
                    {
                        type: 'MCQ',
                        questions: Array.from({ length: 3 }, (_, i) => ({
                            text: `MCQ ${i + 1}?`,
                            options: ['A', 'B', 'C', 'D'],
                            answer: 'A',
                            explanation: 'Because A.',
                            difficulty: i === 0 ? 'easy' : 'medium',
                        })),
                    },
                    {
                        type: 'SHORT',
                        questions: [{ text: 'Short Q1?', answer: 'Answer.', difficulty: 'medium' }],
                    },
                    {
                        type: 'LONG',
                        questions: [{ text: 'Long Q1?', answer: 'Answer.', difficulty: 'hard' }],
                    },
                ],
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
