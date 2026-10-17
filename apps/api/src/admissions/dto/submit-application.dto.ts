// src/admissions/dto/submit-application.dto.ts — public 4-step form payload.
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitApplicationDto {
  @ApiProperty({ example: 'Applicant Five' })
  @IsString()
  @Length(2, 120)
  studentName: string;

  @ApiProperty({ example: 'Guardian Five' })
  @IsString()
  @Length(2, 120)
  guardianName: string;

  @ApiProperty({ example: '01712345678' })
  @IsString()
  @Length(6, 20)
  phone: string;

  @ApiProperty({ example: 'applicant5@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Class 6' })
  @IsIn(['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'])
  classWanted: string;

  @ApiPropertyOptional({ example: 'Previous School Name' })
  @IsOptional()
  @IsString()
  @Length(0, 160)
  previousSchool?: string;
}
