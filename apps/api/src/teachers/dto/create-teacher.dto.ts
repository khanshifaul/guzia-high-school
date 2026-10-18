// src/teachers/dto/create-teacher.dto.ts — creates a login user + teacher row.
import { IsDateString, IsEmail, IsOptional, IsString, Length, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTeacherDto {
  @ApiProperty({ example: 'teacher4@guziahs.edu' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Teacher Four' })
  @IsString()
  @Length(2, 120)
  fullName: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 20)
  phone?: string;

  // ─── Extra profile (matches expanded Teacher model) ───
  @ApiPropertyOptional({ description: 'Photo URL' })
  @IsOptional() @IsString() @Length(0, 500) photoUrl?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 20) emergencyPhone?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 40) nid?: string;
  @ApiPropertyOptional({ enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] })
  @IsOptional() @IsString() @Length(0, 3) bloodGroup?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 40) religion?: string;
  @ApiPropertyOptional({ example: 'M.Sc, B.Ed' })
  @IsOptional() @IsString() @Length(0, 160) qualification?: string;
  @ApiPropertyOptional({ example: 'Senior Teacher' })
  @IsOptional() @IsString() @Length(0, 80) designation?: string;
  @ApiPropertyOptional({ example: 'Science' })
  @IsOptional() @IsString() @Length(0, 80) department?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 300) address?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsDateString() joinDate?: string;
}
