// src/auth/common/interfaces/jwt-payload.interface.ts — slimmed from zylosync:
// same shape style, only the claims this app issues.
export interface JwtPayload {
  sub: string;
  email: string;
  role?: string;
  type?: string;
  iat?: number;
  exp?: number;
}
