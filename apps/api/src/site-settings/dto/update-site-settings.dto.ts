// src/site-settings/dto/update-site-settings.dto.ts — admin edit of public
// site info (phone, email, EIIN, board, socials, important links).
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsOptional, IsString, IsUrl, Length, Matches, ValidateIf, ValidateNested } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ImportantLinkDto {
  @ApiPropertyOptional({ example: 'Dhaka Education Board' })
  @IsString()
  @Length(1, 120)
  label: string;

  @ApiPropertyOptional({ example: 'ঢাকা শিক্ষা বোর্ড' })
  @IsString()
  labelBn?: string;

  @ApiPropertyOptional({ example: 'https://dhakaeducationboard.gov.bd' })
  @IsString()
  @Length(1, 300)
  href: string;
}

export class UpdateSiteSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 120) schoolName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 120) schoolNameBn?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 40) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 40) hotline?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 120) email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 40) eiin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 120) board?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 200) address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 200) addressBn?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 20) established?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 300) tagline?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 300) taglineBn?: string;

  // An empty string clears the link, so it is not validated as a URL.
  @ApiPropertyOptional() @IsOptional() @ValidateIf((_o, value) => value !== '') @IsUrl({ require_tld: false }) facebookUrl?: string;
  // An empty string clears the link, so it is not validated as a URL.
  @ApiPropertyOptional() @IsOptional() @ValidateIf((_o, value) => value !== '') @IsUrl({ require_tld: false }) twitterUrl?: string;
  // An empty string clears the link, so it is not validated as a URL.
  @ApiPropertyOptional() @IsOptional() @ValidateIf((_o, value) => value !== '') @IsUrl({ require_tld: false }) instagramUrl?: string;
  // An empty string clears the link, so it is not validated as a URL.
  @ApiPropertyOptional() @IsOptional() @ValidateIf((_o, value) => value !== '') @IsUrl({ require_tld: false }) youtubeUrl?: string;
  // An empty string clears the link, so it is not validated as a URL.
  @ApiPropertyOptional() @IsOptional() @ValidateIf((_o, value) => value !== '') @IsUrl({ require_tld: false }) linkedinUrl?: string;
  // An empty string clears the link, so it is not validated as a URL.
  @ApiPropertyOptional() @IsOptional() @ValidateIf((_o, value) => value !== '') @IsUrl({ require_tld: false }) websiteUrl?: string;

  @ApiPropertyOptional({ description: 'Google Maps embed iframe src for the /contact page' })
  @IsOptional()
  @IsString()
  @Length(1, 800)
  mapEmbedUrl?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated admission types the school actually offers',
    example: 'day,residential',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(day|residential)(,(day|residential))?$/, {
    message: 'Use day and/or residential, comma-separated',
  })
  admissionTypes?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated shift names, at most 2 (empty means the school runs no shifts)',
    example: 'Morning,Afternoon',
  })
  @IsOptional()
  @IsString()
  @Matches(/^$|^[^,]{1,40}$|^[^,]{1,40},[^,]{1,40}$/, {
    message: 'At most 2 shifts, comma-separated',
  })
  shifts?: string;

  @ApiPropertyOptional({ type: [ImportantLinkDto] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ImportantLinkDto)
  importantLinks?: ImportantLinkDto[];
}
