import type { Request, Response } from 'express';
import { env, isProduction } from '../env.js';

export const REFRESH_COOKIE = 'refresh_token';

/** Parse a short JWT-style duration ("30d", "12h", "30m", "45s", or raw seconds). */
export function durationToMs(value: string): number {
  const match = /^(\d+)\s*([smhd])?$/.exec(value.trim());
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = match[2] ?? 's';
  const factor = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit] ?? 1000;
  return amount * factor;
}

/**
 * The refresh token lives in an httpOnly, SameSite=Strict, signed cookie scoped to
 * the auth routes only. JS cannot read it (XSS-resistant) and browsers will not send
 * it cross-site (CSRF-resistant), so the refresh endpoint needs no extra CSRF token.
 */
export function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    signed: true,
    path: '/api/auth',
    maxAge: durationToMs(env.JWT_REFRESH_EXPIRES_IN),
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    signed: true,
    path: '/api/auth',
  });
}

export function readRefreshCookie(req: Request): string | undefined {
  return req.signedCookies?.[REFRESH_COOKIE];
}
