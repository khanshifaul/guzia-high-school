// src/pages/dto/update-page.dto.ts — admin edits a page's own identity and
// whether the whole page is published. The slug is not editable: it is the
// public URL the app fetches.
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class UpdatePageDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @Length(1, 120)
    title?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @Length(0, 120)
    titleBn?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    published?: boolean;
}
