// src/teacher-dashboard/teacher-dashboard.controller.ts — the teacher's
// dashboard summary.
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { TeacherDashboardService } from './teacher-dashboard.service';

@ApiTags('Teacher Dashboard')
@Controller('teacher/dashboard')
export class TeacherDashboardController {
    constructor(private readonly service: TeacherDashboardService) {}

    @Roles('TEACHER')
    @Get()
    @ApiOperation({
        summary: "The teacher's today view",
        description:
            'Their sections with today\'s attendance state, the assignments still waiting to be graded, and their lesson-plan progress.',
    })
    summary(@User() user: { id: string }) {
        return this.service.summary(user.id);
    }
}
