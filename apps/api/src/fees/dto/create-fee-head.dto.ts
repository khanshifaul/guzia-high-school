// src/fees/dto/create-fee-head.dto.ts
import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFeeHeadDto {
  @ApiProperty({ example: 'Monthly Tuition' })
  @IsString()
  @Length(2, 80)
  name: string;

  @ApiProperty({ example: 1200 })
  @IsInt()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Scope to a class; omit for school-wide' })
  @IsOptional()
  @IsString()
  classId?: string;
}
