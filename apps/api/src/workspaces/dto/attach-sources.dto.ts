import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AttachSourcesDto {
  @ApiProperty({ type: [String], description: 'Library source ids to attach (pointers)' })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  sourceIds: string[];
}
