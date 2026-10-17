// src/exams/dto/create-exam.dto.ts
import { IsDateString, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExamDto {
  @ApiProperty({ example: 'Final Term 2026' })
  @IsString()
  @Length(2, 120)
  name: string;

  @ApiProperty({ description: 'Class id' })
  @IsString()
  classId: string;

  @ApiProperty({ example: '2026-11-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-11-10' })
  @IsDateString()
  endDate: string;
}
