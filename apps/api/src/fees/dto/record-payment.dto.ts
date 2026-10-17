// src/fees/dto/record-payment.dto.ts — admin records a manual payment.
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaymentMethodInput {
  CASH = 'CASH',
  BANK = 'BANK',
  BKASH_ROCKET = 'BKASH_ROCKET',
  OTHER = 'OTHER',
}

export class RecordPaymentDto {
  @ApiProperty()
  @IsString()
  studentId: string;

  @ApiProperty({ example: 2500 })
  @IsInt()
  @Min(1)
  amount: number;

  @ApiProperty({ enum: PaymentMethodInput })
  @IsEnum(PaymentMethodInput)
  method: PaymentMethodInput;

  @ApiPropertyOptional({ example: 'TXN12345' })
  @IsOptional()
  @IsString()
  reference?: string;
}
