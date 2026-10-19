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

import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { StudentsService, type StudentViewer } from './students.service';
import { BulkCreateStudentsDto, CreateStudentDto, UpdateStudentDto } from './dto';

@ApiTags('Students')
@Controller('students')
export class StudentsController {
  constructor(private readonly service: StudentsService) {}

  @Roles('ADMIN', 'TEACHER')
  @Get()
  @ApiOperation({
    summary: 'List students (search/filter)',
    description:
      'ADMIN sees every student. TEACHER sees only the rosters of the classes they teach.',
  })
  findAll(
    @User() user: { id: string; role: string },
    @Query('search') search?: string,
    @Query('classId') classId?: string,
    @Query('sectionId') sectionId?: string,
  ) {
    const params = { search, classId, sectionId };
    return user.role === 'TEACHER'
      ? this.service.findAllForTeacher(user.id, params)
      : this.service.findAll(params);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Student detail with stats + transcript',
    description:
      'Access is checked server-side: ADMIN sees any student, TEACHER the students they teach, STUDENT themselves, PARENT their own children.',
  })
  findOne(@Param('id') id: string, @User() user: { id: string; role: StudentViewer['role'] }) {
    return this.service.findOne(id, { userId: user.id, role: user.role });
  }

  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateStudentDto) {
    return this.service.create(dto);
  }

  @Roles('ADMIN')
  @Post('bulk')
  @ApiOperation({ summary: 'Bulk import students from parsed CSV rows' })
  bulkCreate(@Body() dto: BulkCreateStudentsDto) {
    return this.service.bulkCreate(dto.students);
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
