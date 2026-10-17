// src/classes/dto/create-class.dto.ts
import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClassDto {
  @ApiProperty({ example: 'Class 8' })
  @IsString()
  @Length(2, 40)
  name: string;
}
