// src/ai/llm/llm.service.ts — the one door to a model.
//
// Provider precedence (first match wins):
//   1. an ENABLED DB AiProviderConfig row (admin-configured, encrypted key);
//      a row named "mock…" is the deterministic offline fixture.
//   2. env-only provider:
//        AI_PROVIDER=custom  → AI_BASE_URL + AI_MODEL + AI_API_KEY
//        AI_PROVIDER=deepseek→ DEEPSEEK_BASE_URL + DEEPSEEK_MODEL + DEEPSEEK_API_KEY
//        AI_PROVIDER=mock    → mock fixtures
//      A partially configured env provider is a 503, never a silent fallback.
//   3. KILO_* gateway (both URL and token set).
//   4. nothing → 503.
//
// Key truth: presence is decided by the stored ciphertext (apiKeyEnc) or the
// env key — never by apiKeyHint (a display-only mask). A keyless provider on a
// loopback/private host (or when AI_ALLOW_KEYLESS_PROVIDER=true) gets a
// placeholder key; a keyless public provider is a 503 before any network call.
//
// Every failure is mapped to a Nest HttpException here: 401/403 → 503 rejected
// key, 429 and 5xx/network get one retry, timeouts and 4xx never retry. Each
// call logs one structured JSON line (no key, no prompt body, no base URL).
import {
    HttpException,
    Injectable,
    Logger,
    ServiceUnavailableException,
    UnprocessableEntityException,
    type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../database/database.service';
import { OpenAI } from 'openai';
import { decrypt } from './crypto.util';
import { parseJsonObject } from './json.util';
import type { ZodType } from 'zod';
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

export interface LlmHealth {
    configured: boolean;
    source: 'db' | 'env' | 'mock' | 'none';
    model: string | null;
    keyPresent: boolean;
    lastLatencyMs: number | null;
    lastError: string | null;
    checkedAt: string;
}

/** Text and vision calls have different budgets; both are hard limits. */
const TEXT_TIMEOUT_MS = 30_000;
const VISION_TIMEOUT_MS = 90_000;

/** At most two attempts: the original plus one retry. */
const MAX_ATTEMPTS = 2;
const DEFAULT_RATE_LIMIT_DELAY_MS = 500;
const MAX_RETRY_AFTER_MS = 30_000;

/** Placeholder API key for keyless loopback/private providers (llama.cpp,
 *  Ollama, LM Studio). Never sent to a public host. */
const PLACEHOLDER_KEY = 'keyless-local-provider';

const CACHE_TTL_MS = 60_000;

interface CachedConfig {
    config: AiProviderConfig;
    fetchedAt: number;
}

interface GatewayError extends Error {
    status?: number;
    headers?: unknown;
}

interface ProviderReply {
    content: string;
    promptTokens: number | null;
    completionTokens: number | null;
    finishReason: string | null;
}

interface OpenAIProvider {
    kind: 'openai';
    source: 'db' | 'env';
    name: string;
    baseUrl: string;
    apiKey: string;
    textModel: string;
    visionModel: string | null;
    temperature: number;
    maxTokens: number;
    keyPresent: boolean;
    keylessLocal: boolean;
    failure: null;
}

interface KiloProvider {
    kind: 'kilo';
    source: 'env';
    name: string;
    gatewayUrl: string;
    token: string;
    textModel: string;
    visionModel: string | null;
    keyPresent: true;
    keylessLocal: false;
    failure: null;
}

interface MockProvider {
    kind: 'mock';
    source: 'mock';
    name: string;
    model: string;
    keyPresent: false;
    keylessLocal: false;
    failure: null;
}

interface UnusableProvider {
    kind: 'unusable';
    source: 'db' | 'env';
    name: string;
    model: string;
    keyPresent: boolean;
    keylessLocal: boolean;
    failure: HttpException;
}

type ResolvedProvider = OpenAIProvider | KiloProvider | MockProvider | UnusableProvider;

type ProviderCallKind =
    | 'auth'
    | 'rate_limit'
    | 'server'
    | 'network'
    | 'timeout'
    | 'truncated'
    | 'request'
    | 'error';

/** A classified provider failure — the retry policy lives in this shape. */
class ProviderCallError extends Error {
    constructor(
        readonly outcome: ProviderCallKind,
        readonly retryable: boolean,
        readonly retryAfterMs: number,
        readonly http: HttpException,
        readonly finishReason: string | null = null,
    ) {
        super(http.message);
        this.name = 'ProviderCallError';
    }
}

@Injectable()
export class LlmService implements OnModuleInit {
    private readonly logger = new Logger(LlmService.name);
    private cache: CachedConfig | null = null;
    private lastLatencyMs: number | null = null;
    private lastError: string | null = null;

    constructor(
        private readonly prisma: DatabaseService,
        private readonly configService: ConfigService,
    ) {}

    /**
     * One boot-time line when a keyless local provider is active. A missing
     * key elsewhere is surfaced by the first call (503), not by crashing boot.
     */
    async onModuleInit(): Promise<void> {
        try {
            const provider = await this.resolveProvider();
            if (provider?.kind === 'openai' && provider.keylessLocal) {
                this.logger.log(
                    `LLM provider "${provider.name}" is keyless on a local/private host; ` +
                        `using a placeholder key (model ${provider.textModel}).`,
                );
            }
        } catch (err) {
            this.logger.warn(`LLM provider boot check failed: ${(err as Error).message}`);
        }
    }

    /** Force the next call to re-read config (called after admin saves). */
    invalidateCache(): void {
        this.cache = null;
    }

    /** Resolve the enabled DB provider row (null when absent or disabled). */
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

    /**
     * Complete a prompt against the resolved provider. Returns the raw text.
     * Every provider error is already a typed HttpException by the time it
     * leaves this method; a `finish_reason: "length"` reply is a 422 so no
     * caller ever JSON-parses a truncated object.
     */
    async complete(opts: LlmCompleteOpts): Promise<string> {
        const provider = await this.resolveProvider();
        if (!provider) {
            throw new ServiceUnavailableException(
                'AI provider is not configured; set one in AI provider settings or via AI_* env.',
            );
        }
        if (provider.failure) throw provider.failure;

        if (provider.kind === 'mock') {
            const started = Date.now();
            const content = this.mockComplete(opts);
            this.logCall(provider.name, provider.model, Date.now() - started, null, null, null, 'ok', opts);
            return content;
        }

        return (await this.callWithRetry(provider, opts)).content;
    }

    /**
     * JSON contract: parse + validate against the caller's zod schema. On a
     * parse or schema failure the same prompt is re-asked exactly once with
     * the concrete validation error appended to the user message. The base
     * system/user prompts are left untouched. No silent empty fallback.
     */
    async completeJson<T>(opts: LlmCompleteOpts, schema: ZodType<T>): Promise<T> {
        const first = this.parseAndValidate(await this.complete(opts), schema);
        if (first.success) return first.data;

        const repair: LlmCompleteOpts = {
            ...opts,
            user:
                `${opts.user}\n\n` +
                `Your previous reply was invalid: ${first.error}\n` +
                'Reply again with ONLY the corrected JSON object that satisfies the contract.',
        };
        const second = this.parseAndValidate(await this.complete(repair), schema);
        if (second.success) return second.data;

        throw new UnprocessableEntityException(
            `AI reply did not match the expected JSON contract after one repair attempt: ${second.error}`,
        );
    }

    /** Admin health snapshot: no secret, no base URL, no prompt content. */
    async health(): Promise<LlmHealth> {
        let provider: ResolvedProvider | null = null;
        try {
            provider = await this.resolveProvider();
        } catch {
            provider = null;
        }
        return {
            configured: Boolean(provider && !provider.failure),
            source: provider?.source ?? 'none',
            model:
                provider === null
                    ? null
                    : provider.kind === 'openai' || provider.kind === 'kilo'
                      ? provider.textModel
                      : provider.model,
            keyPresent: provider?.keyPresent ?? false,
            lastLatencyMs: this.lastLatencyMs,
            lastError: this.lastError,
            checkedAt: new Date().toISOString(),
        };
    }

    // ---------------------------------------------------------------------
    // Provider resolution (precedence chain)
    // ---------------------------------------------------------------------

    private async resolveProvider(): Promise<ResolvedProvider | null> {
        const dbConfig = await this.getConfig();
        if (dbConfig) {
            // A DB row always wins — even a broken one. Falling through to an
            // env provider would make the office's settings lie.
            if (dbConfig.name.toLowerCase().startsWith('mock')) {
                return {
                    kind: 'mock',
                    source: 'mock',
                    name: dbConfig.name,
                    model: dbConfig.textModel || 'mock',
                    keyPresent: false,
                    keylessLocal: false,
                    failure: null,
                };
            }
            return this.openAiProvider({
                source: 'db',
                name: dbConfig.name,
                baseUrl: dbConfig.baseUrl,
                textModel: dbConfig.textModel,
                visionModel: dbConfig.visionModel,
                temperature: dbConfig.temperature,
                maxTokens: dbConfig.maxTokens,
                apiKeyEnc: dbConfig.apiKeyEnc,
                apiKey: null,
            });
        }

        const env = this.envProvider();
        if (env) return env;

        if (this.kiloConfigured()) {
            const textModel = this.configService.get<string>('KILO_MODEL') || 'kilo-auto/free';
            return {
                kind: 'kilo',
                source: 'env',
                name: 'Kilo',
                gatewayUrl: this.configService.get<string>('KILO_GATEWAY_URL')!,
                token: this.configService.get<string>('KILO_API_TOKEN')!,
                textModel,
                visionModel: this.configService.get<string>('KILO_VISION_MODEL') || null,
                keyPresent: true,
                keylessLocal: false,
                failure: null,
            };
        }

        return null;
    }

    /** Env-only provider (step 2 of the precedence chain), or null. */
    private envProvider(): ResolvedProvider | null {
        const provider = this.configService.get<string>('AI_PROVIDER');
        const baseUrl = this.configService.get<string>('AI_BASE_URL') || null;
        const model = this.configService.get<string>('AI_MODEL') || null;
        const apiKey = this.configService.get<string>('AI_API_KEY') || null;

        if (provider === 'mock') {
            return {
                kind: 'mock',
                source: 'mock',
                name: 'Mock (env)',
                model: 'mock',
                keyPresent: false,
                keylessLocal: false,
                failure: null,
            };
        }

        if (provider === 'deepseek') {
            return this.openAiProvider({
                source: 'env',
                name: 'DeepSeek',
                baseUrl:
                    this.configService.get<string>('DEEPSEEK_BASE_URL') ||
                    'https://api.deepseek.com/v1',
                textModel: this.configService.get<string>('DEEPSEEK_MODEL') || 'deepseek-chat',
                visionModel: null,
                temperature: 0.3,
                maxTokens: 2048,
                apiKeyEnc: null,
                apiKey: this.configService.get<string>('DEEPSEEK_API_KEY') || null,
            });
        }

        // AI_PROVIDER=custom, or a half-set custom pair. Either way the intent
        // is explicit, so an incomplete pair is a 503 rather than a fallback.
        if (provider === 'custom' || baseUrl || model) {
            if (!baseUrl || !model) {
                return {
                    kind: 'unusable',
                    source: 'env',
                    name: 'custom',
                    model: model ?? 'unknown',
                    keyPresent: Boolean(apiKey),
                    keylessLocal: false,
                    failure: new ServiceUnavailableException(
                        'custom AI provider is incomplete: set both AI_BASE_URL and AI_MODEL (model unknown)',
                    ),
                };
            }
            return this.openAiProvider({
                source: 'env',
                name: 'custom',
                baseUrl,
                textModel: model,
                visionModel: null,
                temperature: 0.3,
                maxTokens: 2048,
                apiKeyEnc: null,
                apiKey,
            });
        }

        return null;
    }

    /**
     * Build the OpenAI-compatible target, resolving key truth. A decrypt
     * failure or a keyless public host is a typed 503 here — before any
     * network call and without falling through to another provider.
     */
    private openAiProvider(values: {
        source: 'db' | 'env';
        name: string;
        baseUrl: string;
        textModel: string;
        visionModel: string | null;
        temperature: number;
        maxTokens: number;
        apiKeyEnc: string | null;
        apiKey: string | null;
    }): OpenAIProvider | UnusableProvider {
        const { name, textModel, baseUrl } = values;
        const keyPresent = Boolean(values.apiKeyEnc || values.apiKey);
        let apiKey = values.apiKey;

        if (values.apiKeyEnc) {
            try {
                apiKey = decrypt(values.apiKeyEnc);
            } catch {
                return {
                    kind: 'unusable',
                    source: values.source,
                    name,
                    model: textModel,
                    keyPresent: true,
                    keylessLocal: false,
                    failure: new ServiceUnavailableException(
                        `provider ${name} key could not be decrypted; an admin must re-save it (model ${textModel})`,
                    ),
                };
            }
        }

        if (!apiKey) {
            if (this.isKeylessLocal(baseUrl) || this.allowKeylessProvider()) {
                apiKey = PLACEHOLDER_KEY;
                return {
                    kind: 'openai',
                    source: values.source,
                    name,
                    baseUrl,
                    apiKey,
                    textModel,
                    visionModel: values.visionModel,
                    temperature: values.temperature,
                    maxTokens: values.maxTokens,
                    keyPresent,
                    keylessLocal: true,
                    failure: null,
                };
            }
            return {
                kind: 'unusable',
                source: values.source,
                name,
                model: textModel,
                keyPresent: false,
                keylessLocal: false,
                failure: new ServiceUnavailableException(
                    `provider ${name} has no API key; an admin must set it in AI provider settings (model ${textModel})`,
                ),
            };
        }

        return {
            kind: 'openai',
            source: values.source,
            name,
            baseUrl,
            apiKey,
            textModel,
            visionModel: values.visionModel,
            temperature: values.temperature,
            maxTokens: values.maxTokens,
            keyPresent,
            keylessLocal: false,
            failure: null,
        };
    }

    private kiloConfigured(): boolean {
        return Boolean(
            this.configService.get<string>('KILO_GATEWAY_URL') &&
                this.configService.get<string>('KILO_API_TOKEN'),
        );
    }

    /** Loopback + RFC1918 + *.local hosts may run without a key. */
    private isKeylessLocal(baseUrl: string): boolean {
        let host: string;
        try {
            host = new URL(baseUrl).hostname.toLowerCase();
        } catch {
            return false;
        }
        if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);
        if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
        if (host.startsWith('10.') || host.startsWith('192.168.')) return true;
        if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(host)) return true;
        return host.endsWith('.local');
    }

    private allowKeylessProvider(): boolean {
        const raw = this.configService.get<string | boolean>('AI_ALLOW_KEYLESS_PROVIDER');
        return raw === true || raw === 'true' || raw === '1';
    }

    // ---------------------------------------------------------------------
    // Calls, retries, error mapping, observability
    // ---------------------------------------------------------------------

    private async callWithRetry(
        provider: OpenAIProvider | KiloProvider,
        opts: LlmCompleteOpts,
    ): Promise<ProviderReply> {
        let lastError: ProviderCallError | null = null;
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
            try {
                return await this.attempt(provider, opts);
            } catch (err) {
                if (!(err instanceof ProviderCallError)) throw err;
                lastError = err;
                if (!err.retryable || attempt === MAX_ATTEMPTS) throw err.http;
                await this.sleep(err.retryAfterMs);
            }
        }
        throw lastError?.http ??
            new ServiceUnavailableException(`provider ${provider.name} failed (model unknown)`);
    }

    private async attempt(
        provider: OpenAIProvider | KiloProvider,
        opts: LlmCompleteOpts,
    ): Promise<ProviderReply> {
        const started = Date.now();
        const timeoutMs = this.timeoutFor(opts);
        const model = this.modelFor(provider, opts);
        const controller = new AbortController();
        let timedOut = false;
        const timer = setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, timeoutMs);

        try {
            const reply =
                provider.kind === 'kilo'
                    ? await this.kiloAttempt(provider, opts, model, controller.signal)
                    : await this.openaiAttempt(provider, opts, model, controller.signal, timeoutMs);

            if (reply.finishReason === 'length') {
                throw new ProviderCallError(
                    'truncated',
                    false,
                    0,
                    new UnprocessableEntityException(
                        `provider ${provider.name} response truncated by max_tokens (model ${model}); ` +
                            'increase maxTokens and retry',
                    ),
                    reply.finishReason,
                );
            }

            const latencyMs = Date.now() - started;
            this.logCall(
                provider.name,
                model,
                latencyMs,
                reply.promptTokens,
                reply.completionTokens,
                reply.finishReason,
                'ok',
                opts,
            );
            this.lastLatencyMs = latencyMs;
            this.lastError = null;
            return reply;
        } catch (err) {
            const callError =
                err instanceof ProviderCallError
                    ? err
                    : this.mapError(err, provider, model, timedOut, timeoutMs);
            const latencyMs = Date.now() - started;
            this.logCall(
                provider.name,
                model,
                latencyMs,
                null,
                null,
                callError.finishReason,
                callError.outcome,
                opts,
            );
            this.lastLatencyMs = latencyMs;
            this.lastError = exceptionMessage(callError.http);
            throw callError;
        } finally {
            clearTimeout(timer);
        }
    }

    private async openaiAttempt(
        provider: OpenAIProvider,
        opts: LlmCompleteOpts,
        model: string,
        signal: AbortSignal,
        timeoutMs: number,
    ): Promise<ProviderReply> {
        const client = new OpenAI({
            apiKey: provider.apiKey,
            baseURL: provider.baseUrl,
            timeout: timeoutMs,
            // Retries are ours: the SDK's own retry would double the timeout
            // budget and hide the attempt count from the policy above.
            maxRetries: 0,
        });

        const response = await client.chat.completions.create(
            {
                model,
                temperature: provider.temperature,
                max_tokens: opts.maxTokens ?? provider.maxTokens,
                ...(opts.json ? { response_format: { type: 'json_object' as const } } : {}),
                messages: [
                    { role: 'system', content: opts.system },
                    ...(opts.history ?? []),
                    { role: 'user', content: this.userContent(opts) },
                ],
            },
            { signal },
        );

        return {
            content: response.choices[0]?.message?.content ?? '',
            promptTokens: response.usage?.prompt_tokens ?? null,
            completionTokens: response.usage?.completion_tokens ?? null,
            finishReason: response.choices[0]?.finish_reason ?? null,
        };
    }

    private async kiloAttempt(
        provider: KiloProvider,
        opts: LlmCompleteOpts,
        model: string,
        signal: AbortSignal,
    ): Promise<ProviderReply> {
        const body = {
            model,
            temperature: 0.3,
            max_tokens: opts.maxTokens ?? 2048,
            ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
            messages: [
                { role: 'system', content: opts.system },
                ...(opts.history ?? []),
                { role: 'user', content: this.userContent(opts) },
            ],
        };

        const res = await fetch(`${provider.gatewayUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${provider.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal,
        });

        if (!res.ok) {
            const err = new Error(`Kilo gateway HTTP ${res.status}`) as GatewayError;
            err.status = res.status;
            err.headers = res.headers;
            throw err;
        }

        const data = (await res.json()) as unknown;
        const content = extractKiloContent(data);
        if (content.trim().length === 0) {
            // A reasoning model can spend the whole max_tokens budget on
            // reasoning and emit nothing; the reason names the cause.
            this.logger.warn(
                `Kilo gateway returned no text (finish_reason=${extractKiloFinishReason(data) ?? 'unknown'}, ` +
                    `model=${extractKiloModel(data)}). Pin KILO_MODEL to a non-reasoning model.`,
            );
        }

        return {
            content,
            promptTokens: extractUsage(data, 'prompt_tokens'),
            completionTokens: extractUsage(data, 'completion_tokens'),
            finishReason: extractKiloFinishReason(data),
        };
    }

    /** Map any provider error to a typed, sanitized Exception + retry policy. */
    private mapError(
        err: unknown,
        provider: OpenAIProvider | KiloProvider,
        model: string,
        timedOut: boolean,
        timeoutMs: number,
    ): ProviderCallError {
        const status =
            typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
                ? err.status
                : undefined;
        const headers =
            typeof err === 'object' && err !== null && 'headers' in err ? err.headers : undefined;
        const errorName =
            typeof err === 'object' && err !== null && 'name' in err ? err.name : undefined;
        const errorMessage =
            typeof err === 'object' &&
            err !== null &&
            'message' in err &&
            typeof err.message === 'string'
                ? err.message
                : '';

        if (
            timedOut ||
            errorName === 'APIConnectionTimeoutError' ||
            errorName === 'TimeoutError' ||
            errorName === 'AbortError'
        ) {
            return new ProviderCallError(
                'timeout',
                false,
                0,
                new ServiceUnavailableException(
                    `provider ${provider.name} timed out after ${Math.round(timeoutMs / 1000)}s (model ${model})`,
                ),
            );
        }

        if (status === 401 || status === 403) {
            return new ProviderCallError(
                'auth',
                false,
                0,
                new ServiceUnavailableException(
                    `provider ${provider.name} rejected the key (model ${model})`,
                ),
            );
        }

        if (status === 429) {
            const delay =
                parseRetryAfter(headerValue(headers, 'retry-after')) ??
                DEFAULT_RATE_LIMIT_DELAY_MS;
            return new ProviderCallError(
                'rate_limit',
                true,
                delay,
                new ServiceUnavailableException(
                    `provider ${provider.name} rate-limited the request (model ${model})`,
                ),
            );
        }

        if (typeof status === 'number' && status >= 500) {
            return new ProviderCallError(
                'server',
                true,
                jitterDelay(),
                new ServiceUnavailableException(
                    `provider ${provider.name} returned HTTP ${status} (model ${model})`,
                ),
            );
        }

        if (
            errorName === 'APIConnectionError' ||
            /ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|fetch failed|network|Unexpected end/i.test(
                errorMessage,
            )
        ) {
            return new ProviderCallError(
                'network',
                true,
                jitterDelay(),
                new ServiceUnavailableException(
                    `provider ${provider.name} is unreachable (model ${model})`,
                ),
            );
        }

        // Everything else (400 included): a sanitized 503, never the SDK text.
        if (typeof status === 'number') {
            return new ProviderCallError(
                'request',
                false,
                0,
                new ServiceUnavailableException(
                    `provider ${provider.name} returned HTTP ${status} (model ${model})`,
                ),
            );
        }

        return new ProviderCallError(
            'error',
            false,
            0,
            new ServiceUnavailableException(`provider ${provider.name} failed (model ${model})`),
        );
    }

    private timeoutFor(opts: LlmCompleteOpts): number {
        return opts.vision || (opts.images?.length ?? 0) > 0
            ? VISION_TIMEOUT_MS
            : TEXT_TIMEOUT_MS;
    }

    private modelFor(provider: OpenAIProvider | KiloProvider, opts: LlmCompleteOpts): string {
        const wantsVision = Boolean(opts.vision || (opts.images?.length ?? 0) > 0);
        return wantsVision && provider.visionModel ? provider.visionModel : provider.textModel;
    }

    /** The text prompt, or a text+image content array for vision calls. */
    private userContent(opts: LlmCompleteOpts) {
        if (!opts.images?.length) return opts.user;
        return [
            { type: 'text' as const, text: opts.user },
            ...opts.images.map((img) => ({
                type: 'image_url' as const,
                image_url: { url: `data:${img.mime};base64,${img.base64}` },
            })),
        ];
    }

    /** One structured line per provider call. Never key, prompt body or URL. */
    private logCall(
        provider: string,
        model: string,
        latencyMs: number,
        promptTokens: number | null,
        completionTokens: number | null,
        finishReason: string | null,
        outcome: string,
        opts: LlmCompleteOpts,
    ): void {
        const historyChars = (opts.history ?? []).reduce((n, turn) => n + turn.content.length, 0);
        this.logger.log(
            JSON.stringify({
                provider,
                model,
                latencyMs,
                promptTokens,
                completionTokens,
                finishReason,
                outcome,
                promptChars: opts.system.length + opts.user.length + historyChars,
            }),
        );
    }

    private parseAndValidate<T>(
        raw: string,
        schema: ZodType<T>,
    ): { success: true; data: T } | { success: false; error: string } {
        let json: unknown;
        try {
            json = parseJsonObject(raw);
        } catch (err) {
            return { success: false, error: `not valid JSON (${(err as Error).message})` };
        }

        const result = schema.safeParse(json);
        if (!result.success) {
            const detail = result.error.issues
                .slice(0, 5)
                .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
                .join('; ')
                .slice(0, 300);
            return { success: false, error: `schema mismatch (${detail})` };
        }
        return { success: true, data: result.data };
    }

    private sleep(ms: number): Promise<void> {
        const { promise, resolve } = Promise.withResolvers<void>();
        setTimeout(resolve, ms);
        return promise;
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
/** Routed model id from a gateway reply, for diagnostics. */
function extractKiloModel(data: unknown): string {
    if (typeof data !== 'object' || data === null || !('model' in data)) return 'unknown';
    const model = data.model;
    return typeof model === 'string' ? model : 'unknown';
}

/** `finish_reason` of the first choice, or null. */
function extractKiloFinishReason(data: unknown): string | null {
    if (typeof data !== 'object' || data === null || !('choices' in data)) return null;
    const choices = data.choices;
    if (!Array.isArray(choices) || choices.length === 0) return null;
    const first: unknown = choices[0];
    if (typeof first !== 'object' || first === null || !('finish_reason' in first)) return null;
    const reason = first.finish_reason;
    return typeof reason === 'string' ? reason : null;
}

function extractKiloContent(data: unknown): string {
    if (typeof data !== 'object' || data === null || !('choices' in data)) return '';
    const choices = data.choices;
    if (!Array.isArray(choices) || choices.length === 0) return '';
    const first: unknown = choices[0];
    if (typeof first !== 'object' || first === null || !('message' in first)) return '';
    const message = first.message;
    if (typeof message !== 'object' || message === null || !('content' in message)) return '';
    const content = message.content;
    return typeof content === 'string' ? content : '';
}

/** Token count from a gateway reply (`usage` is often absent on mocks). */
function extractUsage(data: unknown, key: 'prompt_tokens' | 'completion_tokens'): number | null {
    if (typeof data !== 'object' || data === null || !('usage' in data)) return null;
    const usage = data.usage;
    if (typeof usage !== 'object' || usage === null) return null;
    const usageRecord = usage as Record<string, unknown>; // gateway JSON object
    const value = usageRecord[key];
    return typeof value === 'number' ? value : null;
}

function headerValue(headers: unknown, name: string): string | undefined {
    if (typeof headers !== 'object' || headers === null) return undefined;
    if ('get' in headers && typeof headers.get === 'function') {
        const get = headers.get as (key: string) => unknown; // Headers-like accessor
        const value = get(name);
        return typeof value === 'string' ? value : undefined;
    }
    const headersRecord = headers as Record<string, unknown>; // plain-object SDK headers
    for (const [key, value] of Object.entries(headersRecord)) {
        if (key.toLowerCase() === name.toLowerCase()) return String(value);
    }
    return undefined;
}

/** Retry-After in ms (seconds or HTTP date), capped at 30s. */
function parseRetryAfter(value: string | undefined): number | undefined {
    if (!value) return undefined;
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) {
        return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
    }
    const at = Date.parse(value);
    if (Number.isNaN(at)) return undefined;
    return Math.min(Math.max(at - Date.now(), 0), MAX_RETRY_AFTER_MS);
}

/** 300–800ms backoff for 5xx/network retries. */
function jitterDelay(): number {
    return 300 + Math.floor(Math.random() * 501);
}

/** Sanitized message out of an HttpException (string or {message}). */
function exceptionMessage(exception: HttpException): string {
    const response = exception.getResponse();
    if (typeof response === 'string') return response;
    if (
        typeof response === 'object' &&
        response !== null &&
        'message' in response &&
        typeof response.message === 'string'
    ) {
        return response.message;
    }
    return exception.message;
}
