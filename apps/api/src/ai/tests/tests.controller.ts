// src/ai/tests/tests.controller.ts — teacher test-paper endpoints.
import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../../common/decorators/user.decorator';
import { TestsService } from './tests.service';
import { GeneratePaperDto } from './dto/generate-paper.dto';
import { RateLimit } from '../../common/rate-limiter/rate-limit.guard';

@ApiTags('AI Tests')
@Controller('ai/tests')
export class TestsController {
    constructor(private readonly service: TestsService) {}

    @Roles('TEACHER')
    @Get()
    list(@User() user: { id: string }) {
        return this.service.list(user.id);
    }

    @Roles('TEACHER')
    @Post('generate')
    @RateLimit('ai:generate', 60_000, 10)
    @ApiOperation({ summary: 'Generate an editable test paper (AI)' })
    generate(@Body() dto: GeneratePaperDto, @User() user: { id: string }) {
        return this.service.generate(dto, user.id);
    }

    @Roles('TEACHER')
    @Get(':id')
    findOne(@Param('id') id: string, @User() user: { id: string }) {
        return this.service.findOne(id, user.id);
    }

    @Roles('TEACHER')
    @Delete(':id')
    remove(@Param('id') id: string, @User() user: { id: string }) {
        return this.service.remove(id, user.id);
    }
}
