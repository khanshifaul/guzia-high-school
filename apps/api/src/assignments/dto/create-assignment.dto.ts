// src/assignments/dto/create-assignment.dto.ts
import { IsDateString, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAssignmentDto {
  @ApiProperty({ example: 'Algebra Practice 3' })
  @IsString()
  @Length(2, 160)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  subjectId: string;

  @ApiProperty()
  @IsString()
  classId: string;

  @ApiProperty({ example: '2026-11-05' })
  @IsDateString()
  dueDate: string;
}
