import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { User } from '@prisma/client';
import { prisma } from './db.js';
import { env } from './env.js';
import { forbidden, unauthorized } from './errors.js';
import { hasRole, isBanned, type Role } from './policies/roles.policy.js';
import { assertStoreAccess, assertStoreAccessForPaymentProof } from './policies/storeAccess.policy.js';

// Re-export the store-access policy so existing call sites keep importing from auth.
export { assertStoreAccess } from './policies/storeAccess.policy.js';

/**
 * Token model (documented choice):
 *  - Access token: short-lived JWT, sent as a Bearer header. Carries `tv`
 *    (the user's tokenVersion) so it can be revoked server-side.
 *  - Refresh token: long-lived JWT delivered as an httpOnly, SameSite=Strict
 *    cookie so it is NOT readable by JS — an XSS that steals the in-memory access
 *    token still cannot mint new ones, and the short access TTL bounds the damage.
 *
 * Revocation: bumping User.tokenVersion (on logout / password change / reset)
 * invalidates every previously issued access AND refresh token immediately.
 */

type TokenType = 'access' | 'refresh';
type JwtPayload = { sub: string; tv: number; type: TokenType };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

function sign(user: Pick<User, 'id' | 'tokenVersion'>, type: TokenType, expiresIn: string) {
  return jwt.sign({ sub: user.id, tv: user.tokenVersion, type }, env.JWT_SECRET, {
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function signAccessToken(user: Pick<User, 'id' | 'tokenVersion'>) {
  return sign(user, 'access', env.JWT_EXPIRES_IN);
}

export function signRefreshToken(user: Pick<User, 'id' | 'tokenVersion'>) {
  return sign(user, 'refresh', env.JWT_REFRESH_EXPIRES_IN);
}

/** Back-compat alias used by existing call sites; issues an access token. */
export const signToken = signAccessToken;

export function issueTokens(user: Pick<User, 'id' | 'tokenVersion'>) {
  return { token: signAccessToken(user), refreshToken: signRefreshToken(user) };
}

function verify(token: string, type: TokenType): JwtPayload {
  const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  if (payload.type !== type) throw new Error('Wrong token type.');
  return payload;
}

export function bearerToken(req: Request): string | undefined {
  const header = req.header('Authorization');
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
}

/** Best-effort user id from any valid (non-expired) token, regardless of type. Used by logout. */
export function peekUserId(token: string | undefined): string | undefined {
  if (!token) return undefined;
  try {
    return (jwt.verify(token, env.JWT_SECRET) as { sub?: string }).sub;
  } catch {
    return undefined;
  }
}

/** Load the token's user only if the token version still matches (not revoked). */
async function userForToken(payload: JwtPayload): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) return null;
  if (user.tokenVersion !== payload.tv) return null;
  return user;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = bearerToken(req);
  if (!token) return next(unauthorized());
  try {
    const payload = verify(token, 'access');
    const user = await userForToken(payload);
    if (!user) return next(unauthorized());
    if (isBanned(user)) return next(forbidden('This account is banned.'));
    req.user = user;
    return next();
  } catch {
    return next(unauthorized());
  }
}

/** Verify a refresh token (from cookie or body) and return its still-valid user. */
export async function userForRefreshToken(token: string | undefined): Promise<User | null> {
  if (!token) return null;
  try {
    const payload = verify(token, 'refresh');
    return await userForToken(payload);
  } catch {
    return null;
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!hasRole(req.user, roles)) return next(forbidden(`Requires one of: ${roles.join(', ')}.`));
    return next();
  };
}

/**
 * Blocks every authenticated app surface until a generated shop owner rotates
 * their one-time password. Only /auth/* (me, change-password, logout) stays open.
 */
export function blockIfMustChangePassword(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.mustChangePassword) {
    return next(forbidden('You must change your temporary password before continuing.'));
  }
  return next();
}

export async function requireStoreAccess(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(unauthorized());
  try {
    await assertStoreAccess(req.user, req.params.storeId);
    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Guard for the payment-proof routes only. Lets a still-RESTRICTED owner reach their
 * own store's proof endpoints (the one thing they can do before approval).
 */
export async function requireStoreAccessForPaymentProof(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(unauthorized());
  try {
    await assertStoreAccessForPaymentProof(req.user, req.params.storeId);
    return next();
  } catch (error) {
    return next(error);
  }
}
