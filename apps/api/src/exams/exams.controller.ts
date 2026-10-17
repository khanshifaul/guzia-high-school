// src/exams/exams.controller.ts — exams + marks + report cards.
import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Put,
    Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ExamsService } from './exams.service';
import { CreateExamDto, SubmitMarksDto } from './dto';
import type { Band } from './grading.util';

@ApiTags('Exams')
@Controller('exams')
export class ExamsController {
    constructor(private readonly service: ExamsService) {}

    @Roles('ADMIN', 'TEACHER')
    @Get()
    findAll(@Query('classId') classId?: string) {
        return this.service.findAll(classId);
    }

    @Roles('ADMIN', 'TEACHER')
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Roles('ADMIN')
    @Post()
    create(@Body() dto: CreateExamDto) {
        return this.service.create(dto);
    }

    @Roles('ADMIN', 'TEACHER')
    @Post(':id/marks')
    @ApiOperation({ summary: 'Bulk upsert marks (server validates against total)' })
    submitMarks(@Param('id') id: string, @Body() dto: SubmitMarksDto) {
        return this.service.submitMarks(id, dto);
    }

    @Roles('ADMIN')
    @Post(':id/publish')
    publish(@Param('id') id: string, @Body('published') published: boolean) {
        return this.service.publish(id, published);
    }

    @Roles('ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
    @Get(':id/report-card/:studentId')
    reportCard(@Param('id') id: string, @Param('studentId') studentId: string) {
        return this.service.reportCard(id, studentId);
    }

    @Roles('ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
    @Get('results/student/:studentId')
    resultsForStudent(@Param('studentId') studentId: string) {
        return this.service.resultsForStudent(studentId);
    }

    @Roles('ADMIN')
    @Put('grade-bands')
    replaceBands(@Body() bands: Band[]) {
        return this.service.replaceBands(bands);
    }
}
