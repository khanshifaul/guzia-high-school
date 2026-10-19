// src/ai/materials/materials.controller.ts — teacher study-material endpoints.
import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../../common/decorators/user.decorator';
import { RateLimit } from '../../common/rate-limiter/rate-limit.guard';
import { MaterialsService } from './materials.service';
import { GenerateMaterialDto } from './dto/generate-material.dto';

@ApiTags('AI Materials')
@Controller('ai/materials')
export class MaterialsController {
    constructor(private readonly service: MaterialsService) {}

    @Roles('TEACHER')
    @Post()
    @RateLimit('ai:generate', 60_000, 10)
    @ApiOperation({ summary: 'Generate and save flashcards or a mind map (AI)' })
    generate(@Body() dto: GenerateMaterialDto, @User() user: { id: string }) {
        return this.service.generate(user.id, dto);
    }

    @Roles('TEACHER')
    @Get()
    @ApiQuery({ name: 'classId', required: false })
    @ApiQuery({ name: 'subjectId', required: false })
    @ApiOperation({ summary: 'List the teacher’s saved study materials' })
    list(
        @User() user: { id: string },
        @Query('classId') classId?: string,
        @Query('subjectId') subjectId?: string,
    ) {
        return this.service.list(user.id, { classId, subjectId });
    }

    @Roles('TEACHER')
    @Get(':id')
    @ApiOperation({ summary: 'Get one saved study material' })
    findOne(@Param('id') id: string, @User() user: { id: string }) {
        return this.service.get(user.id, id);
    }

    @Roles('TEACHER')
    @Delete(':id')
    @ApiOperation({ summary: 'Delete a saved study material' })
    remove(@Param('id') id: string, @User() user: { id: string }) {
        return this.service.remove(user.id, id);
    }
}
