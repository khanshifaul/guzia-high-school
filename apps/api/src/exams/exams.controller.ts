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
import { Roles } from '../common/decorators/roles.decorator';
import { ExamsService } from './exams.service';
import { CreateExamDto, SubmitMarksDto } from './dto';
import type { Band } from './grading.util';
import { User } from '../common/decorators/user.decorator';
import {
    StudentAccessService,
    type StudentAccessViewer,
} from '../common/access/student-access.service';

@ApiTags('Exams')
@Controller('exams')
export class ExamsController {
    constructor(
        private readonly service: ExamsService,
        private readonly access: StudentAccessService,
    ) {}

    @Roles('ADMIN', 'TEACHER')
    @Get()
    findAll(@Query('classId') classId?: string) {
        return this.service.findAll(classId);
    }

    @Roles('ADMIN')
    @Get('grade-bands')
    @ApiOperation({ summary: 'The current grade bands (for the admin editor)' })
    bands() {
        return this.service.bands();
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
    async reportCard(
        @Param('id') id: string,
        @Param('studentId') studentId: string,
        @User() user: { id: string; role: StudentAccessViewer['role'] },
    ) {
        await this.access.assertCanViewStudent(studentId, { userId: user.id, role: user.role });
        return this.service.reportCard(id, studentId);
    }

    @Roles('ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
    @Get('results/student/:studentId')
    async resultsForStudent(
        @Param('studentId') studentId: string,
        @User() user: { id: string; role: StudentAccessViewer['role'] },
    ) {
        await this.access.assertCanViewStudent(studentId, { userId: user.id, role: user.role });
        return this.service.resultsForStudent(studentId);
    }

    @Roles('ADMIN')
    @Put('grade-bands')
    replaceBands(@Body() bands: Band[]) {
        return this.service.replaceBands(bands);
    }


}
