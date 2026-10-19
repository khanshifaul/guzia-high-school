// src/ai/materials/dto/generate-material.dto.ts — request body for
// POST /api/ai/materials.
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateMaterialDto {
    @ApiProperty({ enum: ['FLASHCARDS', 'MINDMAP'] })
    @IsIn(['FLASHCARDS', 'MINDMAP'])
    kind: 'FLASHCARDS' | 'MINDMAP';

    @ApiPropertyOptional({ description: 'Generate from one source document' })
    @IsOptional()
    @IsString()
    sourceId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    classId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    subjectId?: string;

    @ApiPropertyOptional({
        minimum: 1,
        maximum: 30,
        default: 12,
        description: 'Flashcard count (ignored for MINDMAP)',
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(30)
    count?: number;
}
