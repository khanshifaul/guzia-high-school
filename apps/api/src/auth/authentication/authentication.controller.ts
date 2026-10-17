// src/auth/authentication/authentication.controller.ts — adapted from
// zylosync's AuthController: login sets the httpOnly session cookie (our web
// app reads it via /auth/me), logout clears it, me returns the profile.
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { User } from '../../common/decorators/user.decorator';
import { clearAuthCookie, setAuthCookie } from '../../common/cookie.util';
import { LoginDto } from './dto/login.dto';
import { AuthenticationService, LoginResult } from './authentication.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthenticationController {
  constructor(private readonly authCoreService: AuthenticationService) {}

  // ========== LOGIN ==========
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with email and password',
    description:
      'Authenticates a user and sets the httpOnly `ghs_token` session cookie. The access token is also returned for Bearer use (Swagger/curl).',
  })
  @ApiBody({
    description: 'Login credentials',
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email', example: 'admin@guziahs.edu' },
        password: { type: 'string', example: 'password123' },
        rememberMe: {
          type: 'boolean',
          example: false,
          description: 'Extend the session cookie to 30 days if true',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful (cookie set)',
    schema: {
      example: {
        success: true,
        message: 'Login successful',
        data: {
          user: { id: 'ckx...', email: 'admin@guziahs.edu', fullName: 'Admin', role: 'ADMIN' },
          accessToken: 'eyJhbGciOiJIUzI1NiIs...',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean; message: string; data: LoginResult }> {
    const result = await this.authCoreService.handleLoginFlow(
      loginDto.email,
      loginDto.password,
    );
    setAuthCookie(res, result.accessToken, loginDto.rememberMe ?? false);
    return { success: true, message: 'Login successful', data: result };
  }

  // ========== ME ==========
  @Get('me')
  @ApiOperation({ summary: 'Current user profile from the session cookie' })
  async me(@User() user: { id: string }) {
    const profile = await this.authCoreService.getProfile(user.id);
    return { success: true, message: 'ok', data: profile };
  }

  // ========== LOGOUT ==========
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear the session cookie' })
  logout(@Res({ passthrough: true }) res: Response) {
    clearAuthCookie(res);
    return { success: true, message: 'Logged out', data: null };
  }
}
