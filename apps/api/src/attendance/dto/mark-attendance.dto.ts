// src/attendance/dto/mark-attendance.dto.ts — teacher marks a section for a date.
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum AttendanceStatusInput {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
}

export class AttendanceRecordInput {
  @ApiProperty({ description: 'Student id' })
  @IsString()
  studentId: string;

  @ApiProperty({ enum: AttendanceStatusInput })
  @IsEnum(AttendanceStatusInput)
  status: AttendanceStatusInput;
}

export class MarkAttendanceDto {
  @ApiProperty({ description: 'Section id' })
  @IsString()
  sectionId: string;

  @ApiProperty({ example: '2026-10-17', description: 'Attendance date (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiProperty({ type: [AttendanceRecordInput] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordInput)
  records: AttendanceRecordInput[];
}
