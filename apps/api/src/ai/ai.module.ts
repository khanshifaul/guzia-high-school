// src/ai/ai.module.ts — at-risk classifier + admin LLM provider config +
// teacher toolkit (plans/tests/sources).
import { Module, OnModuleInit } from '@nestjs/common';
import { UploadModule } from '../upload/upload.module';
import { RateLimiterService } from '../common/rate-limiter/rate-limiter.service';
import { AiController } from './ai.controller';
import { AtRiskService } from './at-risk.service';
import { LlmService } from './llm/llm.service';
import { ProviderConfigService } from './provider-config.service';
import { ProviderConfigController } from './provider-config.controller';
import { PlansService } from './plans/plans.service';
import { PlansController } from './plans/plans.controller';
import { TestsService } from './tests/tests.service';
import { TestsController } from './tests/tests.controller';
import { SourcesService } from './sources/sources.service';
import { RetrievalService } from './sources/retrieval.service';
import { SourcesController } from './sources/sources.controller';
import { MaterialsController } from './materials/materials.controller';
import { MaterialsService } from './materials/materials.service';
import { EmbeddingsService } from './embeddings/embeddings.service';

@Module({
    imports: [UploadModule],
    controllers: [
        AiController,
        ProviderConfigController,
        PlansController,
        TestsController,
        SourcesController,
        MaterialsController,
    ],
    providers: [
        AtRiskService,
        LlmService,
        ProviderConfigService,
        PlansService,
        TestsService,
        SourcesService,
        RetrievalService,
        EmbeddingsService,
        MaterialsService,
        RateLimiterService,
    ],
    exports: [
        AtRiskService,
        LlmService,
        ProviderConfigService,
        RateLimiterService,
        EmbeddingsService,
        RetrievalService,
    ],
})
export class AiModule implements OnModuleInit {
    constructor(private readonly limiter: RateLimiterService) {}

    onModuleInit(): void {
        // spec 10 rate limits: 10 generation req/min, 5 uploads/min per user.
        this.limiter.registerLimit('ai:generate', 60_000, 10);
        this.limiter.registerLimit('ai:upload', 60_000, 5);
        // Answer autosave during an online test — many calls per attempt.
        this.limiter.registerLimit('ai:attempt', 60_000, 120);
    }
}
