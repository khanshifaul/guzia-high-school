// src/ai/ai.controller.ts — at-risk endpoints (admin-only).
import { Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { AtRiskService } from './at-risk.service';

@ApiTags('AI')
@Controller('ai')
export class AiController {
    constructor(private readonly atRisk: AtRiskService) {}

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
}
