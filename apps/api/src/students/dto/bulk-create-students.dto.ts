// src/students/dto/bulk-create-students.dto.ts — bulk import payload: a list
// of resolved student rows (class/section already resolved to ids by client).
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateStudentDto } from './create-student.dto';

export class BulkCreateStudentsDto {
  @ApiProperty({ type: [CreateStudentDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateStudentDto)
  students: CreateStudentDto[];
}
