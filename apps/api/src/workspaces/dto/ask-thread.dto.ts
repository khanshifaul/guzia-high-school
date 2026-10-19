import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AskThreadDto {
  @ApiProperty({ example: 'How does the poet describe the village at dawn?' })
  @IsString()
  @Length(1, 500)
  question: string;
}
