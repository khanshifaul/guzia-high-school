// src/pages/dto/update-block.dto.ts — admin edits a section. `key` and `kind`
// are immutable: changing either would silently reinterpret the stored body.
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const BODY_MAX = 200 * 1024;

export class UpdateBlockDto {
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

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number;
}
