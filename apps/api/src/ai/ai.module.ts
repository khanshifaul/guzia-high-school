// src/ai/ai.module.ts — at-risk classifier (+ future teacher-toolkit).
import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AtRiskService } from './at-risk.service';

@Module({
    controllers: [AiController],
    providers: [AtRiskService],
    exports: [AtRiskService],
})
export class AiModule {}
