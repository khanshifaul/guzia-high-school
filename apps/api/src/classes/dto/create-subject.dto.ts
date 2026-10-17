// src/classes/dto/create-subject.dto.ts
import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubjectDto {
  @ApiProperty({ example: 'Mathematics' })
  @IsString()
  @Length(2, 80)
  name: string;

  @ApiProperty({ example: 'MATH' })
  @IsString()
  @Length(2, 12)
  code: string;
}
