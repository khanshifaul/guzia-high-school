// src/exams/dto/submit-marks.dto.ts — bulk marks entry for one exam.
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkInput {
  @ApiProperty()
  @IsString()
  studentId: string;

  @ApiProperty()
  @IsString()
  subjectId: string;

  @ApiProperty({ example: 85 })
  @IsInt()
  @Min(0)
  marksObtained: number;

  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(1)
  totalMarks: number;
}

export class SubmitMarksDto {
  @ApiProperty({ type: [MarkInput] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => MarkInput)
  marks: MarkInput[];
}
