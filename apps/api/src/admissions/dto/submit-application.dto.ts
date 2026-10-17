// src/admissions/dto/submit-application.dto.ts — public single-step form
// payload: student + guardian info, academic choice, and attachments (photo,
// birth certificate, testimonial/transfer certificate).
import {
  IsArray,
  IsEmail,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitApplicationDto {
  // ─── Student ───
  @ApiProperty({ example: 'Applicant Five' })
  @IsString()
  @Length(2, 120)
  studentName: string;

  @ApiPropertyOptional({ example: '2014-05-12' })
  @IsOptional()
  @IsISO8601()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: ['male', 'female', 'other'] })
  @IsOptional()
  @IsIn(['male', 'female', 'other'])
  gender?: string;

  @ApiPropertyOptional({ example: '1234567890123', description: 'Birth registration number' })
  @IsOptional()
  @IsString()
  @Length(0, 40)
  birthCertNo?: string;

  @ApiPropertyOptional({ example: 'Previous School Name' })
  @IsOptional()
  @IsString()
  @Length(0, 160)
  previousSchool?: string;

  // ─── Guardian ───
  @ApiProperty({ example: 'Guardian Five' })
  @IsString()
  @Length(2, 120)
  guardianName: string;

  @ApiPropertyOptional({ enum: ['father', 'mother', 'guardian'] })
  @IsOptional()
  @IsIn(['father', 'mother', 'guardian'])
  guardianRelation?: string;

  @ApiProperty({ example: '01712345678' })
  @IsString()
  @Length(6, 20)
  phone: string;

  @ApiProperty({ example: 'applicant5@example.com' })
  @IsEmail()
  email: string;

  // ─── Address & academic choice ───
  @ApiPropertyOptional({ example: 'Village/Road, Post Office, Upazila' })
  @IsOptional()
  @IsString()
  @Length(0, 300)
  address?: string;

  @ApiProperty({ example: 'Class 6' })
  @IsIn(['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'])
  classWanted: string;

  // ─── Attachments (uploaded via /upload; store the returned URLs) ───
  @ApiPropertyOptional({ description: 'Student photo URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;

  @ApiPropertyOptional({ description: 'Birth certificate URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  birthCertUrl?: string;

  @ApiPropertyOptional({ description: 'Previous school testimonial / transfer certificate URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  testimonialUrl?: string;

  @ApiPropertyOptional({ type: [String], description: 'Other supporting document URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  otherDocs?: string[];

  @ApiPropertyOptional({ description: 'Additional note' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  note?: string;
}
