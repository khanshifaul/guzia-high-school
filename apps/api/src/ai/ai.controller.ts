// src/ai/ai.controller.ts — at-risk endpoints + provider health (admin-only).
import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { AtRiskService } from './at-risk.service';
import { LlmService } from './llm/llm.service';

@ApiTags('AI')
@Controller('ai')
export class AiController {
    constructor(
        private readonly atRisk: AtRiskService,
        private readonly llm: LlmService,
    ) {}

    @Roles('ADMIN')
    @Get('health')
    @ApiOperation({
        summary: 'LLM provider health: resolved source, key presence, last call',
    })
    health() {
        return this.llm.health();
    }

    @Roles('ADMIN')
    @Post('at-risk/recompute')
    @ApiOperation({ summary: 'Recompute at-risk scores for all active students' })
    recompute() {
        return this.atRisk.recompute();
    }

    @Roles('ADMIN')
    @Get('at-risk')
    @ApiOperation({ summary: 'At-risk board (flagged students sorted by score)' })
    board(@Query('atRisk') atRisk?: string) {
        return this.atRisk.board(atRisk === 'true');
    }

    @Roles('ADMIN')
    @Get('at-risk/:studentId')
    @ApiOperation({ summary: "One student's risk row (drill-in from the board)" })
    forStudent(@Param('studentId') studentId: string) {
        return this.atRisk.forStudent(studentId);
    }
}
