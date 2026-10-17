// src/fees/dto/generate-invoices.dto.ts — bulk-assign a fee head to students.
import { IsDateString, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateInvoicesDto {
  @ApiProperty()
  @IsString()
  feeHeadId: string;

  @ApiPropertyOptional({ description: 'Limit to one class (else all active students)' })
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiProperty({ example: '2026-11-10' })
  @IsDateString()
  dueDate: string;
}
