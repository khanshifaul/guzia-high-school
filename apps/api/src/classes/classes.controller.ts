// src/classes/classes.controller.ts — academic structure endpoints.
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ClassesService } from './classes.service';
import { AssignTeacherDto, CreateClassDto, CreateSectionDto, CreateSubjectDto } from './dto';

@ApiTags('Classes')
@Controller('classes')
export class ClassesController {
  constructor(private readonly service: ClassesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Class tree with sections, subjects, teacher assignments' })
  findAll() {
    return this.service.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Single class with roster + subjects' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles('ADMIN')
  @Post()
  createClass(@Body() dto: CreateClassDto) {
    return this.service.createClass(dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  removeClass(@Param('id') id: string) {
    return this.service.removeClass(id);
  }

  @Roles('ADMIN')
  @Post(':id/sections')
  createSection(@Param('id') id: string, @Body() dto: CreateSectionDto) {
    return this.service.createSection(id, dto);
  }

  @Roles('ADMIN')
  @Delete('sections/:id')
  removeSection(@Param('id') id: string) {
    return this.service.removeSection(id);
  }

  @Roles('ADMIN')
  @Post('subjects')
  createSubject(@Body() dto: CreateSubjectDto) {
    return this.service.createSubject(dto);
  }

  @Roles('ADMIN')
  @Delete('subjects/:id')
  removeSubject(@Param('id') id: string) {
    return this.service.removeSubject(id);
  }

  @Roles('ADMIN')
  @Post(':id/subjects/:subjectId')
  attachSubject(@Param('id') id: string, @Param('subjectId') subjectId: string) {
    return this.service.attachSubject(id, subjectId);
  }

  @Roles('ADMIN')
  @Post('assign/:classSubjectId')
  assignTeacher(
    @Param('classSubjectId') classSubjectId: string,
    @Body() dto: AssignTeacherDto,
  ) {
    return this.service.assignTeacher(classSubjectId, dto);
  }
}
