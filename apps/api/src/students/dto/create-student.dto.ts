// src/students/dto/create-student.dto.ts — admin creates a student; a login
// user is created alongside (role STUDENT) using the given temp password.
import {
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStudentDto {
  @ApiProperty({ example: 'ayaan.rahman@guziahs.edu' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Ayaan Rahman' })
  @IsString()
  @Length(2, 120)
  fullName: string;

  @ApiProperty({ example: 'password123', description: 'Initial login password' })
  @IsString()
  @Length(8, 72)
  password: string;

  @ApiProperty({ description: 'Class id' })
  @IsString()
  classId: string;

  @ApiPropertyOptional({ description: 'Section id (optional)' })
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: ['male', 'female', 'other'] })
  @IsOptional()
  @IsIn(['male', 'female', 'other'])
  gender?: string;

  @ApiPropertyOptional({ description: 'Parent (User) id' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  rollNo: number;
}
