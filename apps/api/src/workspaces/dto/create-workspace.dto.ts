import { IsOptional, IsString, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkspaceDto {
  @ApiPropertyOptional({ example: 'Bangla 1st Paper' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  title?: string;

  @ApiPropertyOptional({ description: 'Class id (optional)' })
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiPropertyOptional({ description: 'Subject id (optional)' })
  @IsOptional()
  @IsString()
  subjectId?: string;
}
