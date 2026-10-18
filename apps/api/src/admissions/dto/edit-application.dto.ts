// src/admissions/dto/edit-application.dto.ts — admin edit of a submitted
// application's formData. Only formData is editable; status/userId/review
// fields are locked by the service.
import { IsOptional, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class EditApplicationDto {
    @ApiPropertyOptional({ type: 'object', additionalProperties: true, example: { studentName: 'Rahim Ahmed', classWanted: 'Class 8' } })
    @IsOptional()
    @IsObject()
    formData?: Record<string, string>;
}
