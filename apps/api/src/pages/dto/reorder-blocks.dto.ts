// src/pages/dto/reorder-blocks.dto.ts — the full ordered list of block ids.
// Sending the whole list (not a delta) makes a concurrent delete fail loudly
// instead of silently reordering the wrong rows.
import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class ReorderBlocksDto {
    @ApiProperty({ type: [String], description: 'Every block id on the page, in order' })
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    order: string[];
}
