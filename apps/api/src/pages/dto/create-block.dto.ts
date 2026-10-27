// src/pages/dto/create-block.dto.ts — admin adds a section to a page.
// `bodyEn`/`bodyBn` are JSON documents; the kind's shape lives in
// apps/web/lib/page-blocks.ts (the editor that writes them).
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean,
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    Min,
} from 'class-validator';

/**
 * Block kinds the renderer knows. Kept in step with BLOCK_KINDS in
 * apps/web/lib/page-blocks.ts — that file owns the field shape per kind.
 */
export const BLOCK_KINDS = [
    'cards',
    'stats',
    'testimonials',
    'gallery',
    'services',
    'links',
    'hotlines',
] as const;

export type BlockKind = (typeof BLOCK_KINDS)[number];

/** A body is stored as JSON text; 200 KB is far above the largest seeded block. */
const BODY_MAX = 200 * 1024;

export class CreateBlockDto {
    @ApiProperty({ example: 'highlights', description: 'Stable key, unique per page' })
    @IsString()
    @Matches(/^[a-z0-9][a-z0-9-]{0,63}$/, {
        message: 'key must be lowercase letters, digits and dashes',
    })
    key: string;

    @ApiProperty({ enum: BLOCK_KINDS })
    @IsIn(BLOCK_KINDS)
    kind: BlockKind;

    @ApiPropertyOptional({ description: 'English body (JSON text)' })
    @IsOptional()
    @IsString()
    @MaxLength(BODY_MAX)
    bodyEn?: string;

    @ApiPropertyOptional({ description: 'Bengali body (JSON text, same shape)' })
    @IsOptional()
    @IsString()
    @MaxLength(BODY_MAX)
    bodyBn?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(500)
    imageUrl?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(500)
    linkUrl?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    published?: boolean;

    @ApiPropertyOptional({ description: 'Defaults to after the last block' })
    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number;
}
