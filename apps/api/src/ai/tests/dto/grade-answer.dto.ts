// src/ai/tests/dto/grade-answer.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class GradeAnswerDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(0)
  @Max(200)
  score: number;
}
