import { Router } from 'express';
import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { env } from '../env.js';
import {
  authenticate,
  bearerToken,
  issueTokens,
  peekUserId,
  userForRefreshToken,
} from '../auth.js';
import { auditSecurity } from '../audit.js';
import { ApiError, badRequest, conflict, forbidden, unauthorized } from '../errors.js';
import { loginRateLimiter } from '../security/rateLimit.js';
import { isLocked, lockRetryAfterSeconds, registerFailedLogin, registerSuccessfulLogin } from '../security/lockout.js';
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from '../security/cookies.js';
import { changePasswordSchema, loginSchema, registerOwnerSchema } from '../validators.js';
import { serializeUser } from '../serializers.js';
import { asyncRoute } from '../http.js';
import { uniqueUsername } from '../services/onboarding.js';

export const authRouter = Router();

authRouter.post('/auth/register-owner', asyncRoute(async (req, res) => {
  if (env.ALLOW_OWNER_REGISTRATION !== 'true') throw forbidden('Owner registration is disabled.');
  const input = registerOwnerSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const username = await uniqueUsername(input.username ?? input.email.split('@')[0]);
  const user = await prisma.user.create({
    data: { email: input.email, username, name: input.name, passwordHash, role: 'SHOP_OWNER', passwordChangedAt: new Date() },
  }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw conflict('Email already exists.');
    throw error;
  });
  const tokens = issueTokens(user);
  setRefreshCookie(res, tokens.refreshToken);
  res.status(201).json({ ...tokens, user: serializeUser(user) });
}));

authRouter.post('/auth/login', loginRateLimiter, asyncRoute(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const identifier = input.identifier ?? input.email ?? input.username;
  const user = identifier?.includes('@')
    ? await prisma.user.findUnique({ where: { email: identifier } })
    : await prisma.user.findUnique({ where: { username: identifier! } });

  // Per-account lockout is checked before the password compare so a locked
  // account cannot be probed further.
  if (user && isLocked(user)) {
    const retryAfter = lockRetryAfterSeconds(user);
    res.setHeader('Retry-After', String(retryAfter));
    await auditSecurity(null, 'Login blocked: account locked', user.email, { targetType: 'User', targetId: user.id, ip: req.ip });
    throw new ApiError(429, `Too many failed attempts. Account locked. Try again in ${Math.ceil(retryAfter / 60)} minute(s).`, 'ACCOUNT_LOCKED');
  }

  const passwordOk = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
  if (!user || !passwordOk) {
    if (user) {
      await registerFailedLogin(user.id);
      await auditSecurity(null, 'Failed login attempt', user.email, { targetType: 'User', targetId: user.id, ip: req.ip });
    }
    throw badRequest('Invalid email or password.');
  }
  if (user.ownerStatus === 'BANNED') throw forbidden('This account is banned.');

  await registerSuccessfulLogin(user.id);
  await auditSecurity(user, 'Signed in', user.email, { targetType: 'User', targetId: user.id, ip: req.ip });
  const fresh = { ...user, failedLoginCount: 0, lockedUntil: null };
  const tokens = issueTokens(fresh);
  setRefreshCookie(res, tokens.refreshToken);
  res.json({ ...tokens, user: serializeUser(fresh) });
}));

// Exchange a valid refresh token (httpOnly cookie, or body for non-browser clients)
// for a fresh access token, rotating the refresh cookie. tokenVersion mismatch
// (after logout / password change) rejects revoked refresh tokens.
authRouter.post('/auth/refresh', asyncRoute(async (req, res) => {
  const token = readRefreshCookie(req) ?? (typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : undefined);
  const user = await userForRefreshToken(token);
  if (!user) {
    clearRefreshCookie(res);
    throw unauthorized('Session expired. Please sign in again.');
  }
  if (user.ownerStatus === 'BANNED') {
    clearRefreshCookie(res);
    throw forbidden('This account is banned.');
  }
  const tokens = issueTokens(user);
  setRefreshCookie(res, tokens.refreshToken);
  res.json({ ...tokens, user: serializeUser(user) });
}));

authRouter.get('/auth/me', authenticate, (req, res) => res.json({ user: serializeUser(req.user!) }));

// Logout revokes every token for the user by bumping tokenVersion. Identifies the
// user from the access bearer or the refresh cookie; always succeeds + clears cookie.
authRouter.post('/auth/logout', asyncRoute(async (req, res) => {
  const userId = peekUserId(bearerToken(req)) ?? (await userForRefreshToken(readRefreshCookie(req)))?.id;
  if (userId) {
    const user = await prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } }).catch(() => null);
    if (user) await auditSecurity(user, 'Signed out', user.email, { targetType: 'User', targetId: user.id, ip: req.ip });
  }
  clearRefreshCookie(res);
  res.json({ ok: true });
}));

// Forced first-login rotation and ordinary password changes. Bumps tokenVersion to
// revoke other sessions, then re-issues tokens so the current session stays signed in.
authRouter.post('/auth/change-password', authenticate, asyncRoute(async (req, res) => {
  const input = changePasswordSchema.parse(req.body);
  const user = req.user!;
  if (!(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
    throw badRequest('Current password is incorrect.');
  }
  const passwordHash = await bcrypt.hash(input.newPassword, 12);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false, passwordChangedAt: new Date(), tokenVersion: { increment: 1 } },
  });
  await auditSecurity(updated, 'Changed password', updated.email, { targetType: 'User', targetId: updated.id, ip: req.ip });
  const tokens = issueTokens(updated);
  setRefreshCookie(res, tokens.refreshToken);
  res.json({ ...tokens, user: serializeUser(updated) });
}));
