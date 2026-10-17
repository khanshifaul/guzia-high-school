// src/classes/dto/create-section.dto.ts
import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSectionDto {
  @ApiProperty({ example: 'A' })
  @IsString()
  @Length(1, 20)
  name: string;
}
