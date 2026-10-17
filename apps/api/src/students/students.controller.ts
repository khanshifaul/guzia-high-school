// src/students/students.controller.ts — student endpoints with role scoping.
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { StudentsService } from './students.service';
import { CreateStudentDto, UpdateStudentDto } from './dto';

@ApiTags('Students')
@Controller('students')
export class StudentsController {
  constructor(private readonly service: StudentsService) {}

  @Roles('ADMIN')
  @Get()
  @ApiOperation({ summary: 'List students (search/filter)' })
  findAll(
    @Query('search') search?: string,
    @Query('classId') classId?: string,
    @Query('sectionId') sectionId?: string,
  ) {
    return this.service.findAll({ search, classId, sectionId });
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Student detail with stats + transcript' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateStudentDto) {
    return this.service.create(dto);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.service.update(id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  block(@Param('id') id: string) {
    return this.service.block(id);
  }
}
