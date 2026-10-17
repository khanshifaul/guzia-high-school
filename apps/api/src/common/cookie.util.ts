// src/common/cookie.util.ts — session cookie contract for the web app.
import { Response } from 'express';

export const AUTH_COOKIE = 'ghs_token';
const DAY_S = 60 * 60 * 24;

export function setAuthCookie(res: Response, token: string, rememberMe: boolean): void {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: (rememberMe ? 30 : 7) * DAY_S * 1000,
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, { path: '/' });
}
