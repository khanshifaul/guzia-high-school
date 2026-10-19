// src/ai/tests/dto/save-answer.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SaveAnswerDto {
  @ApiProperty()
  @IsString()
  questionId: string;

  @ApiProperty({ description: 'Chosen option letter for MCQ, free text otherwise' })
  @IsString()
  answer: string;
}
