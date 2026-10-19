// src/ai/plans/plans.controller.ts — teacher lesson-plan endpoints.
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../../common/decorators/user.decorator';
import { PlansService, GeneratePlanDto, type PlanWeek } from './plans.service';
import { RateLimit } from '../../common/rate-limiter/rate-limit.guard';

@ApiTags('AI Plans')
@Controller('ai/plans')
export class PlansController {
    constructor(private readonly service: PlansService) {}

    @Roles('TEACHER')
    @Get()
    list(@User() user: { id: string }) {
        return this.service.list(user.id);
    }

    @Roles('TEACHER')
    @Post('generate')
    @RateLimit('ai:generate', 60_000, 10)
    @ApiOperation({ summary: 'Generate an editable year/term plan (AI)' })
    generate(@Body() dto: GeneratePlanDto, @User() user: { id: string }) {
        return this.service.generate(dto, user.id);
    }

    @Roles('TEACHER')
    @Get(':id')
    @ApiOperation({ summary: 'One plan with its weeks' })
    findOne(@Param('id') id: string, @User() user: { id: string }) {
        return this.service.findOne(id, user.id);
    }

    @Roles('TEACHER')
    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() patch: { title?: string; weeks?: PlanWeek[]; status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' },
        @User() user: { id: string },
    ) {
        return this.service.update(id, user.id, patch);
    }

    @Roles('TEACHER')
    @Patch(':id/weeks/:week/status')
    setWeekStatus(
        @Param('id') id: string,
        @Param('week') week: string,
        @Body('status') status: 'PLANNED' | 'DONE',
        @User() user: { id: string },
    ) {
        return this.service.setWeekStatus(id, Number(week), status, user.id);
    }

    @Roles('TEACHER')
    @Patch(':id/weeks/:week')
    @ApiOperation({ summary: "Edit one week's topics, objective and assessment" })
    updateWeek(
        @Param('id') id: string,
        @Param('week') week: string,
        @Body() patch: { topics?: string[]; objective?: string; assessment?: string | null },
        @User() user: { id: string },
    ) {
        return this.service.updateWeek(id, Number(week), patch, user.id);
    }


    @Roles('TEACHER')
    @Post(':id/weeks/:week/regenerate')
    @RateLimit('ai:generate', 60_000, 10)
    @ApiOperation({ summary: 'Re-ask the AI for one week, using neighbouring weeks as context' })
    regenerateWeek(
        @Param('id') id: string,
        @Param('week') week: string,
        @User() user: { id: string },
    ) {
        return this.service.regenerateWeek(id, Number(week), user.id);
    }
    @Roles('TEACHER')
    @Delete(':id')
    remove(@Param('id') id: string, @User() user: { id: string }) {
        return this.service.remove(id, user.id);
    }
}
