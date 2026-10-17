// src/ai/plans/dto/generate-plan.dto.ts
import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GeneratePlanDto {
  @ApiProperty()
  @IsString()
  classId: string;

  @ApiProperty()
  @IsString()
  subjectId: string;

  @ApiProperty({ enum: ['YEAR', 'TERM'] })
  @IsIn(['YEAR', 'TERM'])
  type: 'YEAR' | 'TERM';

  @ApiProperty({ example: '2026-11-01' })
  @IsString()
  startDate: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 52 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(52)
  weeks?: number;

  @ApiPropertyOptional({ description: 'Optional focus topics hint' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  topicsHint?: string;
}
