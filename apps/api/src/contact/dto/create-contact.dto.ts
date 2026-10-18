// src/contact/dto/create-contact.dto.ts — public contact-form payload.
import { IsEmail, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({ example: 'Rahim Uddin' })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'rahim@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'I would like to know more about admission.' })
  @IsString()
  @MaxLength(2000)
  message: string;
}
