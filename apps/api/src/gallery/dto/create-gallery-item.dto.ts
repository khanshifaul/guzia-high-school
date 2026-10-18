// src/gallery/dto/create-gallery-item.dto.ts — admin creates/updates a gallery
// image. `url` is the uploaded image URL (from /upload).
import { IsInt, IsOptional, IsString, Length, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGalleryItemDto {
  @ApiProperty({ example: 'Science Fair 2026' })
  @IsString()
  @Length(1, 160)
  title: string;

  @ApiPropertyOptional({ description: 'Title in Bengali' })
  @IsOptional()
  @IsString()
  @Length(0, 160)
  titleBn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 300)
  caption?: string;

  @ApiProperty({ description: 'Uploaded image URL' })
  @IsString()
  @MaxLength(500)
  url: string;

  @ApiPropertyOptional({ example: 'events', description: 'Category tag' })
  @IsOptional()
  @IsString()
  @Length(0, 40)
  category?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
