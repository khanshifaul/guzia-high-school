// src/admissions/admissions.controller.ts — public submit + admin review.
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { AdmissionsService } from './admissions.service';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { ReviewApplicationDto } from './dto/review-application.dto';

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
    queue(@Query('status') status?: string) {
        return this.service.queue(status);
    }

    @Roles('ADMIN')
    @Get(':id')
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
}
