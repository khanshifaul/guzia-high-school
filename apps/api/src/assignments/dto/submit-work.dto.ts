// src/assignments/dto/submit-work.dto.ts
import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitWorkDto {
  @ApiProperty({ description: 'Text answer / work' })
  @IsString()
  @Length(1, 5000)
  content: string;
}
