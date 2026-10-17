import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({
    /* example: 'user@example.com' */
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    /* example: 'password123' */
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    /* example: true, */
    required: false,
    description: 'Extend the session cookie to 30 days if true',
  })
  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}
