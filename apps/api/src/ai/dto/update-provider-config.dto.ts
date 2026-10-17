// src/ai/dto/update-provider-config.dto.ts — partial update for the LLM
// provider row. apiKey is write-only (blank/omitted keeps the stored key).
import {
    IsBoolean,
    IsNumber,
    IsOptional,
    IsString,
    IsUrl,
    Length,
    Max,
    Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProviderConfigDto {
    @ApiPropertyOptional({ example: 'DeepSeek' })
    @IsOptional()
    @IsString()
    @Length(1, 80)
    name?: string;

    @ApiPropertyOptional({ example: 'https://api.deepseek.com/v1' })
    @IsOptional()
    @IsUrl({ require_tld: false })
    baseUrl?: string;

    @ApiPropertyOptional({ example: 'deepseek-chat' })
    @IsOptional()
    @IsString()
    textModel?: string;

    @ApiPropertyOptional({ description: 'Vision model for image OCR path' })
    @IsOptional()
    @IsString()
    visionModel?: string;

    @ApiPropertyOptional({ description: 'Write-only; blank keeps stored key' })
    @IsOptional()
    @IsString()
    apiKey?: string;

    @ApiPropertyOptional({ minimum: 0, maximum: 2 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(2)
    temperature?: number;

    @ApiPropertyOptional({ minimum: 64, maximum: 8192 })
    @IsOptional()
    @IsNumber()
    @Min(64)
    @Max(8192)
    maxTokens?: number;

    @ApiPropertyOptional({ description: 'Kill switch for AI routes' })
    @IsOptional()
    @IsBoolean()
    enabled?: boolean;
}
