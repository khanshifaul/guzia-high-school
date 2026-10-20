// src/notices/notices.controller.ts — notices (create/delete admin+teacher).
import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { NoticesService } from './notices.service';
import { CreateNoticeDto } from './dto';

@ApiTags('Notices')
@Controller('notices')
export class NoticesController {
    constructor(private readonly service: NoticesService) {}

    @Public()
    @Get('public')
    @ApiOperation({ summary: 'Global notices for the public site (ticker/landing)' })
    publicNotices(@Query('limit') limit?: string) {
        const n = limit ? Math.min(parseInt(limit, 10) || 6, 20) : 6;
        return this.service.publicNotices(n);
    }

    @Public()
    @Get('public/:id')
    @ApiOperation({ summary: 'One global notice for its public detail page' })
    publicNotice(@Param('id') id: string) {
        return this.service.publicNotice(id);
    }

    @Roles('ADMIN', 'TEACHER', 'STUDENT', 'PARENT')
    @Get()
    @ApiOperation({ summary: 'Notices visible to the viewer (audience-filtered)' })
    forViewer(@User() user: { role: string }) {
        return this.service.forViewer(user.role);
    }

    @Roles('ADMIN', 'TEACHER')
    @Post()
    create(@Body() dto: CreateNoticeDto, @User() user: { id: string }) {
        return this.service.create(dto, user.id);
    }

    @Roles('ADMIN')
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
