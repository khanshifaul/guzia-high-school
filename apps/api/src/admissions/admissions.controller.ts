// src/admissions/admissions.controller.ts — public submit + admin review,
// applicant self-view, and admin edit of a submitted application.
import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { AdmissionsService } from './admissions.service';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';
import { EditApplicationDto } from './dto/edit-application.dto';

@ApiTags('Admissions')
@Controller('admissions')
export class AdmissionsController {
    constructor(private readonly service: AdmissionsService) {}

    @Public()
    @Post()
    @ApiOperation({ summary: 'Submit an admission application (public)' })
    submit(@Body() dto: SubmitApplicationDto) {
        return this.service.submit(dto);
    }

    @Roles('ADMIN')
    @Get()
    @ApiOperation({ summary: 'Admin review queue (optionally filter by status and class)' })
    queue(@Query('status') status?: string, @Query('class') className?: string) {
        return this.service.queue(status, className);
    }

    @Roles('STUDENT')
    @Get('me')
    @ApiOperation({ summary: 'Applicant: get their own application (self-scoped)' })
    me(@User() user: { id: string }) {
        return this.service.me(user.id);
    }

    @Roles('ADMIN')
    @Get(':id')
    @ApiOperation({ summary: 'Get a single application by id (admin)' })
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Roles('ADMIN')
    @Post(':id/review')
    @ApiOperation({ summary: 'Approve (enrolls student) or reject an application' })
    review(
        @Param('id') id: string,
        @Body() dto: ReviewApplicationDto,
        @User() user: { id: string },
    ) {
        return this.service.review(id, dto, user.id);
    }

    @Roles('ADMIN')
    @Patch(':id')
    @ApiOperation({ summary: 'Edit a submitted application\'s formData (admin)' })
    edit(@Param('id') id: string, @Body() dto: EditApplicationDto) {
        return this.service.edit(id, dto);
    }
}
