import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateThreadDto {
  @ApiProperty({ example: 'Village imagery' })
  @IsString()
  @Length(1, 120)
  title: string;
}
