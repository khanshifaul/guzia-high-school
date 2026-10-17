// src/teachers/dto/update-teacher.dto.ts — partial update for a teacher's
// profile (no credentials).
import { IsOptional, IsString, Length } from 'class-validator';
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
}
