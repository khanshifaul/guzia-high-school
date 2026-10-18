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

  // ─── Extra profile (matches expanded Student model) ───
  @ApiPropertyOptional({ description: 'Name in Bengali' })
  @IsOptional() @IsString() @Length(0, 120) fullNameBn?: string;
  @ApiPropertyOptional({ description: 'Photo URL' })
  @IsOptional() @IsString() @Length(0, 500) photoUrl?: string;
  @ApiPropertyOptional({ enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] })
  @IsOptional() @IsString() @Length(0, 3) bloodGroup?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 40) religion?: string;
  @ApiPropertyOptional({ default: 'Bangladeshi' })
  @IsOptional() @IsString() @Length(0, 40) nationality?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 40) birthCertNo?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 120) guardianName?: string;
  @ApiPropertyOptional({ enum: ['father', 'mother', 'guardian'] })
  @IsOptional() @IsString() @Length(0, 20) guardianRelation?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 20) guardianPhone?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 40) guardianNid?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 160) village?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 40) road?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 40) ward?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 80) postOffice?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 80) policeStation?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 80) upazila?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 80) district?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 20) postalCode?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 160) previousSchool?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsDateString() admissionDate?: string;

  @ApiPropertyOptional({ description: 'Parent (User) id' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  rollNo: number;
}
