// src/ai/provider-config.service.ts — admin CRUD for the LLM provider config.
// The API key is write-only + encrypted at rest; GET returns a masked hint.
// SSRF protection: baseUrl host is checked against an allowlist — private IP
// ranges and link-local addresses are blocked unless explicitly allowlisted
// via ALLOWED_AI_HOSTS (comma-separated). localhost/127.0.0.1/::1 always
// allowed for local Ollama / LM Studio.
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { LlmService } from './llm/llm.service';
import { encrypt } from './llm/crypto.util';
import { UpdateProviderConfigDto } from './dto/update-provider-config.dto';

/** Hosts always allowed (local dev with Ollama / LM Studio). */
const ALWAYS_ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

/** True when host is a private/reserved IP that must be blocked by default. */
function isPrivateOrReservedHost(host: string): boolean {
    const h = host.toLowerCase();
    if (ALWAYS_ALLOWED_HOSTS.has(h)) return false;
    if (
        /^127\./.test(h) ||
        /^10\./.test(h) ||
        /^172\.(1[6-9]|2[0-9]|3[01])\./.test(h) ||
        /^192\.168\./.test(h) ||
        /^169\.254\./.test(h) ||
        /^0\.0\.0\.0$/.test(h)
    ) {
        return true;
    }
    // IPv6 unique local (fc00::/7), link-local (fe80::/10), loopback (::1).
    if (h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe8')) return true;
    return false;
}

/** Validate baseUrl host against SSRF allowlist. Returns error message or null. */
function validateBaseUrlHost(baseUrl: string): string | null {
    let url: URL;
    try {
        url = new URL(baseUrl);
    } catch {
        return 'Invalid base URL.';
    }
    if (!/^https?:$/.test(url.protocol)) {
        return 'Only http:// and https:// base URLs are allowed.';
    }
    const host = url.hostname;
    const allowed =
        ALWAYS_ALLOWED_HOSTS.has(host) ||
        !isPrivateOrReservedHost(host) ||
        (process.env.ALLOWED_AI_HOSTS ?? '')
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .includes(host);
    if (!allowed) {
        return `Base URL host "${host}" is not allowlisted. Add it to ALLOWED_AI_HOSTS.`;
    }
    return null;
}

@Injectable()
export class ProviderConfigService {
    constructor(
        private readonly prisma: DatabaseService,
        private readonly llm: LlmService,
        private readonly configService: ConfigService,
    ) {}

    /** Current config with the key masked (never the raw key). */
    async get() {
        const config = await this.prisma.aiProviderConfig.findUnique({
            where: { id: 'singleton' },
        });
        if (!config) throw new NotFoundException('AI provider config not found');
        const { apiKeyEnc: _enc, ...safe } = config;
        return safe;
    }

    /** Partial update; blank/omitted apiKey keeps the stored key. */
    async update(dto: UpdateProviderConfigDto, updatedById: string) {
        const existing = await this.prisma.aiProviderConfig.findUnique({
            where: { id: 'singleton' },
        });
        if (!existing) throw new NotFoundException('AI provider config not found');

        const secret = this.configService.get<string>('AI_CONFIG_SECRET') ?? '';
        let apiKeyEnc = existing.apiKeyEnc;
        let apiKeyHint = existing.apiKeyHint;
        if (dto.apiKey && dto.apiKey.length > 0) {
            apiKeyEnc = encrypt(dto.apiKey, secret);
            apiKeyHint = maskKey(dto.apiKey);
        }

        if (dto.baseUrl !== undefined && dto.baseUrl.length > 0) {
            const hostError = validateBaseUrlHost(dto.baseUrl);
            if (hostError) throw new NotFoundException(hostError);
        }

        const updated = await this.prisma.aiProviderConfig.update({
            where: { id: 'singleton' },
            data: {
                ...(dto.name !== undefined ? { name: dto.name } : {}),
                ...(dto.baseUrl !== undefined ? { baseUrl: dto.baseUrl } : {}),
                ...(dto.textModel !== undefined ? { textModel: dto.textModel } : {}),
                ...(dto.visionModel !== undefined ? { visionModel: dto.visionModel } : {}),
                ...(dto.temperature !== undefined ? { temperature: dto.temperature } : {}),
                ...(dto.maxTokens !== undefined ? { maxTokens: dto.maxTokens } : {}),
                ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
                apiKeyEnc,
                apiKeyHint,
                updatedById,
            },
        });

        this.llm.invalidateCache();
        const { apiKeyEnc: _enc, ...safe } = updated;
        return safe;
    }

    /**
     * Test-connection: send a tiny completion using the (possibly unsaved) form
     * values. Returns latency + raw reply, or the error. This is the demo
     * "hot-switch provider" proof.
     */
    async testConnection(dto: UpdateProviderConfigDto): Promise<{
        ok: boolean;
        latencyMs?: number;
        reply?: string;
        error?: string;
    }> {
        const secret = this.configService.get<string>('AI_CONFIG_SECRET') ?? '';
        const existing = await this.prisma.aiProviderConfig.findUnique({
            where: { id: 'singleton' },
        });

        const apiKey =
            dto.apiKey && dto.apiKey.length > 0
                ? dto.apiKey
                : existing?.apiKeyEnc
                  ? (await import('./llm/crypto.util')).decrypt(existing.apiKeyEnc, secret)
                  : '';

        const isMock = (dto.name ?? existing?.name ?? '').toLowerCase().startsWith('mock');
        if (isMock) {
            return { ok: true, latencyMs: 0, reply: 'Mock provider reachable.' };
        }

        const baseUrl = dto.baseUrl ?? existing?.baseUrl;
        const textModel = dto.textModel ?? existing?.textModel;
        if (!baseUrl || !textModel) {
            return { ok: false, error: 'baseUrl and textModel are required to test.' };
        }

        const hostError = validateBaseUrlHost(baseUrl);
        if (hostError) return { ok: false, error: hostError };

        const started = Date.now();
        try {
            const { OpenAI } = await import('openai');
            const client = new OpenAI({ apiKey: apiKey || 'missing-key', baseURL: baseUrl });
            const res = await client.chat.completions.create({
                model: textModel,
                max_tokens: 8,
                messages: [{ role: 'user', content: 'ping' }],
            });
            return {
                ok: true,
                latencyMs: Date.now() - started,
                reply: res.choices[0]?.message?.content ?? '(empty)',
            };
        } catch (err) {
            return { ok: false, error: (err as Error).message };
        }
    }

    /**
     * Fetch the provider's available models (OpenAI GET /models). Accepts
     * unsaved form values so the admin can pull the list before saving.
     */
    async listModels(dto: UpdateProviderConfigDto): Promise<{ models: string[] }> {
        const secret = this.configService.get<string>('AI_CONFIG_SECRET') ?? '';
        const existing = await this.prisma.aiProviderConfig.findUnique({
            where: { id: 'singleton' },
        });

        const apiKey =
            dto.apiKey && dto.apiKey.length > 0
                ? dto.apiKey
                : existing?.apiKeyEnc
                  ? (await import('./llm/crypto.util')).decrypt(existing.apiKeyEnc, secret)
                  : '';

        const isMock = (dto.name ?? existing?.name ?? '').toLowerCase().startsWith('mock');
        if (isMock) {
            // Offline demo: return a small static list so the dropdown works.
            return { models: ['mock-text-model', 'mock-vision-model'] };
        }

        const baseUrl = dto.baseUrl ?? existing?.baseUrl;
        if (!baseUrl) {
            throw new NotFoundException('Set a base URL first, then fetch models.');
        }

        const hostError = validateBaseUrlHost(baseUrl);
        if (hostError) throw new NotFoundException(hostError);

        try {
            const { OpenAI } = await import('openai');
            const client = new OpenAI({ apiKey: apiKey || 'missing-key', baseURL: baseUrl });
            const list = await client.models.list();
            const models = (list.data ?? [])
                .map((m) => m.id)
                .filter((id): id is string => typeof id === 'string')
                .sort();
            return { models };
        } catch (err) {
            throw new NotFoundException(`Could not fetch models: ${(err as Error).message}`);
        }
    }
}

/** Mask a key as "sk-…last4" for the UI. */
function maskKey(key: string): string {
    if (key.length <= 4) return '…';
    return `${key.slice(0, 2)}…${key.slice(-4)}`;
}
