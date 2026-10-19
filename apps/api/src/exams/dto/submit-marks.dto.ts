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

  // totalMarks is deliberately absent: the server owns the total for each
  // (exam, subject) and reads it from ExamSubject. A client that sends it
  // is rejected by the global whitelist.
}

export class SubmitMarksDto {
  @ApiProperty({ type: [MarkInput] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => MarkInput)
  marks: MarkInput[];
}
