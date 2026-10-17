// src/ai/ai.module.ts — at-risk classifier + admin LLM provider config +
// teacher toolkit (plans/tests/sources).
import { Module } from '@nestjs/common';
import { UploadModule } from '../upload/upload.module';
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
import { SourcesController } from './sources/sources.controller';

@Module({
    imports: [UploadModule],
    controllers: [
        AiController,
        ProviderConfigController,
        PlansController,
        TestsController,
        SourcesController,
    ],
    providers: [
        AtRiskService,
        LlmService,
        ProviderConfigService,
        PlansService,
        TestsService,
        SourcesService,
    ],
    exports: [AtRiskService, LlmService, ProviderConfigService],
})
export class AiModule {}
