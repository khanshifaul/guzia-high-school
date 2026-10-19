// src/attendance/attendance.controller.ts — attendance endpoints.
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto';
import {
    StudentAccessService,
    type StudentAccessViewer,
} from '../common/access/student-access.service';

@ApiTags('Attendance')
@Controller('attendance')
export class AttendanceController {
    constructor(
        private readonly service: AttendanceService,
        private readonly access: StudentAccessService,
    ) {}

    @Roles('ADMIN', 'TEACHER')
    @Post('mark')
    @ApiOperation({ summary: 'Mark a section for a date (idempotent upsert)' })
    mark(@Body() dto: MarkAttendanceDto, @User() user: { id: string }) {
        return this.service.mark(dto, user.id);
    }

    @Roles('ADMIN', 'TEACHER')
    @Get('section/:sectionId')
    @ApiOperation({ summary: 'Section roster + status for a date' })
    forSectionDate(
        @Param('sectionId') sectionId: string,
        @Query('date') date: string,
    ) {
        return this.service.forSectionDate(sectionId, date);
    }

    @Roles('ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
    @Get('student/:studentId')
    @ApiOperation({ summary: 'Student attendance history + weighted %' })
    async forStudent(
        @Param('studentId') studentId: string,
        @User() user: { id: string; role: StudentAccessViewer['role'] },
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        // A parent may only read their own child's attendance.
        await this.access.assertCanViewStudent(studentId, { userId: user.id, role: user.role });
        return this.service.forStudent(studentId, { from, to });
    }
}
