// src/assignments/assignments.controller.ts — assignment endpoints.
import {
    Body,
    Controller,
    Delete,
    Get,
    NotFoundException,
    Param,
    Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto, GradeSubmissionDto, SubmitWorkDto } from './dto';

@ApiTags('Assignments')
@Controller('assignments')
export class AssignmentsController {
    constructor(
        private readonly service: AssignmentsService,
        private readonly prisma: DatabaseService,
    ) {}

    @Roles('ADMIN', 'TEACHER', 'STUDENT')
    @Get('class/:classId')
    forClass(@Param('classId') classId: string) {
        return this.service.forClass(classId);
    }

    @Roles('ADMIN', 'TEACHER')
    @Post()
    create(@Body() dto: CreateAssignmentDto, @User() user: { id: string }) {
        return this.service.create(dto, user.id);
    }

    @Roles('ADMIN', 'TEACHER')
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }

    @Roles('ADMIN', 'TEACHER')
    @Get(':id/submissions')
    @ApiOperation({ summary: 'All submissions for an assignment (grading view)' })
    submissions(@Param('id') id: string) {
        return this.service.submissions(id);
    }

    @Roles('STUDENT')
    @Post(':id/submit')
    async submit(
        @Param('id') id: string,
        @Body() dto: SubmitWorkDto,
        @User() user: { id: string },
    ) {
        // JWT carries the User id; the submission FK references the Student row.
        const student = await this.prisma.student.findUnique({
            where: { userId: user.id },
        });
        if (!student) throw new NotFoundException('No student linked to this account');
        return this.service.submit(id, student.id, dto);
    }

    @Roles('ADMIN', 'TEACHER')
    @Post('submissions/:id/grade')
    grade(
        @Param('id') id: string,
        @Body() dto: GradeSubmissionDto,
        @User() user: { id: string; role: string },
    ) {
        return this.service.grade(id, dto, user);
    }
}
