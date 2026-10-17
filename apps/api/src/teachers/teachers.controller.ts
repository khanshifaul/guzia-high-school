// src/teachers/teachers.controller.ts — teacher endpoints (admin-only writes).
import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto, UpdateTeacherDto } from './dto';

@ApiTags('Teachers')
@Controller('teachers')
export class TeachersController {
    constructor(private readonly service: TeachersService) {}

    @Roles('ADMIN')
    @Get()
    findAll() {
        return this.service.findAll();
    }

    @Roles('ADMIN', 'TEACHER')
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Roles('ADMIN')
    @Post()
    @ApiOperation({ summary: 'Create a teacher (and login user)' })
    create(@Body() dto: CreateTeacherDto) {
        return this.service.create(dto);
    }

    @Roles('ADMIN')
    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateTeacherDto) {
        return this.service.update(id, dto);
    }

    @Roles('ADMIN')
    @Delete(':id')
    block(@Param('id') id: string) {
        return this.service.block(id);
    }
}
