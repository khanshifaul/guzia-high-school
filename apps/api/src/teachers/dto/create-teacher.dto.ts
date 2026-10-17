// src/teachers/dto/create-teacher.dto.ts — creates a login user + teacher row.
import { IsEmail, IsOptional, IsString, Length, MinLength } from 'class-validator';
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
  phone?: string;
}
