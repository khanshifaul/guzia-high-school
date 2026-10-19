// src/ai/tests/tests.controller.ts — teacher test-paper endpoints plus the
// student-facing online-test routes (spec 10 Feature B).
import { Body, Controller, Delete, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../../common/decorators/user.decorator';
import { TestsService } from './tests.service';
import { GeneratePaperDto } from './dto/generate-paper.dto';
import { GradeAnswerDto, SaveAnswerDto } from './dto';
import { RateLimit } from '../../common/rate-limiter/rate-limit.guard';
import { DatabaseService } from '../../database/database.service';

@ApiTags('AI Tests')
@Controller('ai/tests')
export class TestsController {
    constructor(
        private readonly service: TestsService,
        private readonly prisma: DatabaseService,
    ) {}

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

    // ---------------------------------------------------------------------
    // Online delivery — student routes.
    // ---------------------------------------------------------------------

    @Roles('STUDENT')
    @Get('online/available')
    @ApiOperation({ summary: 'Online tests open to the logged-in student right now' })
    async available(@User() user: { id: string }) {
        const student = await this.resolveStudentId(user.id);
        return this.service.availableForStudent(student);
    }

    @Roles('STUDENT')
    @Post(':id/attempts')
    @ApiOperation({ summary: 'Start (or resume) an attempt at an online test' })
    async startAttempt(@Param('id') id: string, @User() user: { id: string }) {
        const student = await this.resolveStudentId(user.id);
        return this.service.startAttempt(id, student);
    }

    @Roles('STUDENT')
    @Post('attempts/:attemptId/answers')
    @RateLimit('ai:attempt', 60_000, 120)
    @ApiOperation({ summary: 'Save one answer on an in-progress attempt' })
    async saveAnswer(
        @Param('attemptId') attemptId: string,
        @Body() dto: SaveAnswerDto,
        @User() user: { id: string },
    ) {
        const student = await this.resolveStudentId(user.id);
        return this.service.saveAnswer(attemptId, student, dto);
    }

    @Roles('STUDENT')
    @Post('attempts/:attemptId/submit')
    @ApiOperation({ summary: 'Submit an attempt for grading' })
    async submitAttempt(@Param('attemptId') attemptId: string, @User() user: { id: string }) {
        const student = await this.resolveStudentId(user.id);
        return this.service.submitAttempt(attemptId, student);
    }

    // ---------------------------------------------------------------------
    // Online delivery — teacher grading routes.
    // ---------------------------------------------------------------------

    @Roles('TEACHER')
    @Get(':id/attempts')
    @ApiOperation({ summary: 'All attempts on a paper (grading view)' })
    listAttempts(@Param('id') id: string, @User() user: { id: string }) {
        return this.service.listAttempts(id, user.id);
    }

    @Roles('TEACHER')
    @Post('answers/:answerId/grade')
    @ApiOperation({ summary: 'Award a score for a written answer' })
    gradeAnswer(
        @Param('answerId') answerId: string,
        @Body() dto: GradeAnswerDto,
        @User() user: { id: string },
    ) {
        return this.service.gradeAnswer(answerId, user.id, dto);
    }

    /** JWT carries the User id; the attempt FK references the Student row. */
    private async resolveStudentId(userId: string): Promise<string> {
        const student = await this.prisma.student.findUnique({ where: { userId } });
        if (!student) throw new NotFoundException('No student linked to this account');
        return student.id;
    }
}
