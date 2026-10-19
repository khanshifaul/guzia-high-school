// src/admissions/dto/submit-application.dto.ts — public admission form payload.
// Mirrors a Bangladeshi school admission form: student personal info, parents,
// local guardian, present & permanent address, academic history, quota, and a
// declaration. Persisted as JSON in AdmissionApplication.formData.
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const RELIGIONS = ['islam', 'hinduism', 'christianity', 'buddhism', 'other'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GROUPS = ['science', 'humanities', 'business'];
const ADMISSION_TYPES = ['day', 'residential'];
const QUOTAS = ['general', 'freedom-fighter', 'employee', 'staff-child', 'sibling', 'tribal'];

export class SubmitApplicationDto {
  // ─── Student personal ───
  @ApiProperty({ example: 'Applicant Five' })
  @IsString()
  @Length(2, 120)
  studentName: string;

  @ApiPropertyOptional({ description: 'Student name in Bengali' })
  @IsOptional()
  @IsString()
  @Length(0, 120)
  studentNameBn?: string;

  @ApiPropertyOptional({ example: '2014-05-12' })
  @IsOptional()
  @IsISO8601()
  dateOfBirth?: string;

  // No `age` field: the age is derived from `dateOfBirth` by the server
  // (src/common/age.util.ts), so a client cannot store an age that
  // disagrees with the date of birth.

  @ApiPropertyOptional({ enum: ['male', 'female', 'other'] })
  @IsOptional()
  @IsIn(['male', 'female', 'other'])
  gender?: string;

  @ApiPropertyOptional({ example: '1234567890123', description: 'Birth registration number' })
  @IsOptional()
  @IsString()
  @Length(0, 40)
  birthCertNo?: string;

  @ApiPropertyOptional({ enum: RELIGIONS })
  @IsOptional()
  @IsIn(RELIGIONS)
  religion?: string;

  @ApiPropertyOptional({ example: 'Bangladeshi', default: 'Bangladeshi' })
  @IsOptional()
  @IsString()
  @Length(0, 40)
  nationality?: string;

  @ApiPropertyOptional({ enum: BLOOD_GROUPS })
  @IsOptional()
  @IsIn(BLOOD_GROUPS)
  bloodGroup?: string;

  // ─── Father ───
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 120) fatherName?: string;
  @ApiPropertyOptional({ description: 'Father name in Bengali' })
  @IsOptional() @IsString() @Length(0, 120) fatherNameBn?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 80) fatherProfession?: string;
  @ApiPropertyOptional({ description: 'Father NID / passport' })
  @IsOptional() @IsString() @Length(0, 40) fatherNid?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 20) fatherPhone?: string;

  // ─── Mother ───
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 120) motherName?: string;
  @ApiPropertyOptional({ description: 'Mother name in Bengali' })
  @IsOptional() @IsString() @Length(0, 120) motherNameBn?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 80) motherProfession?: string;
  @ApiPropertyOptional({ description: 'Mother NID / passport' })
  @IsOptional() @IsString() @Length(0, 40) motherNid?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 20) motherPhone?: string;

  // ─── Guardian & contact ───
  @ApiProperty({ example: 'Guardian Five' })
  @IsString()
  @Length(2, 120)
  guardianName: string;

  @ApiPropertyOptional({ enum: ['father', 'mother', 'guardian'] })
  @IsOptional()
  @IsIn(['father', 'mother', 'guardian'])
  guardianRelation?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 80) localGuardianProfession?: string;
  @ApiPropertyOptional({ description: 'Guardian NID / BRN / passport' })
  @IsOptional() @IsString() @Length(0, 40) guardianNid?: string;

  @ApiProperty({ example: '01712345678' })
  @IsString()
  @Length(6, 20)
  phone: string;

  @ApiPropertyOptional({ description: 'Emergency contact number' })
  @IsOptional() @IsString() @Length(0, 20) emergencyPhone?: string;

  @ApiProperty({ example: 'applicant5@example.com' })
  @IsEmail()
  email: string;

  // ─── Present address ───
  @ApiPropertyOptional({ description: 'Village / house name / no.' })
  @IsOptional() @IsString() @Length(0, 160) presentVillage?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 40) presentRoad?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 40) presentWard?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 80) presentPostOffice?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 80) presentPoliceStation?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 80) presentUpazila?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 80) presentDistrict?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 20) presentPostalCode?: string;

  // ─── Permanent address ───
  @ApiPropertyOptional({ description: 'Same as present address' })
  @IsOptional() @IsBoolean() permanentSameAsPresent?: boolean;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 160) permanentVillage?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 40) permanentRoad?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 40) permanentWard?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 80) permanentPostOffice?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 80) permanentPoliceStation?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 80) permanentUpazila?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 80) permanentDistrict?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 20) permanentPostalCode?: string;

  // ─── Academic & admission ───
  @ApiProperty({ example: 'Class 6' })
  @IsIn(['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'])
  classWanted: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 40) section?: string;
  @ApiPropertyOptional({ enum: GROUPS, description: 'Group (Class 9–10)' })
  @IsOptional() @IsIn(GROUPS) group?: string;
  @ApiPropertyOptional({ enum: ADMISSION_TYPES })
  @IsOptional() @IsIn(ADMISSION_TYPES) admissionType?: string;
  @ApiPropertyOptional({ description: 'Shift the applicant wants (one of the site settings shifts)' })
  @IsOptional() @IsString() @Length(0, 40) shift?: string;

  @ApiPropertyOptional({ description: 'Previous school name' })
  @IsOptional() @IsString() @Length(0, 160) previousSchool?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 40) previousClass?: string;
  @ApiPropertyOptional({ description: 'Previous result / GPA / division' })
  @IsOptional() @IsString() @Length(0, 40) previousResult?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 40) tcNumber?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsISO8601() tcDate?: string;
  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 20) previousSchoolPhone?: string;

  // ─── Quota & declaration ───
  @ApiPropertyOptional({ enum: QUOTAS })
  @IsOptional() @IsIn(QUOTAS) quota?: string;
  @ApiPropertyOptional({ description: 'Applicant agrees to school rules' })
  @IsOptional() @IsBoolean() declarationAccepted?: boolean;

  // ─── Attachments (uploaded via /upload; store the returned URLs) ───
  @ApiPropertyOptional({ description: 'Student photo URL' })
  @IsOptional() @IsString() @MaxLength(500) photoUrl?: string;
  @ApiPropertyOptional({ description: 'Birth certificate URL' })
  @IsOptional() @IsString() @MaxLength(500) birthCertUrl?: string;
  @ApiPropertyOptional({ description: 'Previous school testimonial / transfer certificate URL' })
  @IsOptional() @IsString() @MaxLength(500) testimonialUrl?: string;
  @ApiPropertyOptional({ type: [String], description: 'Other supporting document URLs' })
  @IsOptional() @IsArray() @IsString({ each: true }) otherDocs?: string[];

  @ApiPropertyOptional({ description: 'Additional note' })
  @IsOptional() @IsString() @Length(0, 500) note?: string;

  // ─── Spam trap ───
  @ApiPropertyOptional({
    description: 'Honeypot — must stay empty. Bots that fill every field are rejected.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
