// src/classes/dto/assign-teacher.dto.ts
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignTeacherDto {
  @ApiProperty({ description: 'Teacher id, or empty string to unassign' })
  @IsString()
  teacherId: string;
}
