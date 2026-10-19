// src/admissions/dto/review-application.dto.ts
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AdmissionDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class ReviewApplicationDto {
  @ApiProperty({ enum: AdmissionDecision })
  @IsEnum(AdmissionDecision)
  decision: AdmissionDecision;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  note?: string;

  @ApiPropertyOptional({
    description:
      'Section of the applied class to enrol the student into. Defaults to the first section of the class.',
  })
  @IsOptional()
  @IsString()
  sectionId?: string;
}
