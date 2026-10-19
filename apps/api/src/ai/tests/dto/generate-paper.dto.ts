// src/ai/tests/dto/generate-paper.dto.ts
import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TestMode } from 'prisma/generated/client';

export class GeneratePaperDto {
  @ApiProperty()
  @IsString()
  classId: string;

  @ApiProperty()
  @IsString()
  subjectId: string;

  @ApiProperty({ type: [String], example: ['Algebra', 'Equations'] })
  @IsArray()
  @IsString({ each: true })
  topics: string[];

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(0)
  @Max(30)
  mcq?: number;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(0)
  @Max(20)
  short?: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(0)
  @Max(10)
  long?: number;

  @ApiProperty({ example: 41 })
  @IsInt()
  @Min(1)
  @Max(200)
  totalMarks: number;

  @ApiProperty({ example: 90 })
  @IsInt()
  @Min(10)
  @Max(300)
  durationMinutes: number;

  @ApiPropertyOptional({ enum: TestMode, example: 'OFFLINE', default: 'OFFLINE' })
  @IsEnum(TestMode)
  @IsOptional()
  mode?: TestMode;

  @ApiPropertyOptional({ example: '2026-11-01T09:00:00Z' })
  @IsDateString()
  @IsOptional()
  startAt?: string;

  @ApiPropertyOptional({ example: '2026-11-01T12:00:00Z' })
  @IsDateString()
  @IsOptional()
  endAt?: string;
}
