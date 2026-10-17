// src/students/dto/update-student.dto.ts — partial updates (no auth fields).
import { PartialType } from '@nestjs/swagger';
import { CreateStudentDto } from './create-student.dto';

// Everything is optional except we drop the login-credential fields: password
// changes go through a dedicated flow, not the student profile update.
export class UpdateStudentDto extends PartialType(CreateStudentDto) {
    override password?: never;
}
