// src/notices/dto/create-notice.dto.ts
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum NoticeAudience {
  ADMIN = 'ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
}

export class CreateNoticeDto {
  @ApiProperty({ example: 'Term Exam Schedule' })
  @IsString()
  @Length(2, 160)
  title: string;

  @ApiProperty({ example: 'Results are now available on the portal.' })
  @IsString()
  @Length(2, 2000)
  body: string;

  @ApiPropertyOptional({
    enum: NoticeAudience,
    description: 'Target audience; omit to publish to everyone',
  })
  @IsOptional()
  @IsEnum(NoticeAudience)
  audience?: NoticeAudience;
}
