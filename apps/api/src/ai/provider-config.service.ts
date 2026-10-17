// src/ai/provider-config.service.ts — admin CRUD for the LLM provider row.
// The API key is write-only + encrypted at rest; GET returns a masked hint.
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { LlmService } from './llm/llm.service';
import { encrypt } from './llm/crypto.util';
import { UpdateProviderConfigDto } from './dto/update-provider-config.dto';

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
}

/** Mask a key as "sk-…last4" for the UI. */
function maskKey(key: string): string {
    if (key.length <= 4) return '…';
    return `${key.slice(0, 2)}…${key.slice(-4)}`;
}
