import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class CreateHeroSlideDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  titleEn: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  titleBn?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  subtitleEn: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  subtitleBn?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ctaTextEn?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ctaTextBn?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ctaLink?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  published?: boolean;
}
