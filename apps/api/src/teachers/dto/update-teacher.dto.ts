// src/teachers/dto/update-teacher.dto.ts — partial update for a teacher's
// profile (no credentials).
import { IsDateString, IsOptional, IsString, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTeacherDto {
  @ApiPropertyOptional({ example: 'Teacher One Updated' })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  fullName?: string;

  @ApiPropertyOptional({ example: '01711000001' })
  @IsOptional()
  @IsString()
  @Length(6, 20)
  phone?: string;

  // ─── Extra profile ───
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 500) photoUrl?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 20) emergencyPhone?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 40) nid?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 3) bloodGroup?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 40) religion?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 160) qualification?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 80) designation?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 80) department?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 300) address?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsDateString() joinDate?: string;
}
