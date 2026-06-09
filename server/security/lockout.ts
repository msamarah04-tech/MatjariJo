import type { User } from '@prisma/client';
import { prisma } from '../db.js';

/**
 * Per-account brute-force lockout, persisted on the User row so it survives
 * restarts. Complements the IP rate limiter: the IP limiter slows a noisy source,
 * this protects a single account from distributed guessing.
 */
const FAIL_THRESHOLD = 5;
const BASE_LOCK_MS = 15 * 60 * 1000; // 15 minutes
const MAX_LOCK_MS = 2 * 60 * 60 * 1000; // 2 hours

export function isLocked(user: Pick<User, 'lockedUntil'>): boolean {
  return !!user.lockedUntil && user.lockedUntil.getTime() > Date.now();
}

export function lockRetryAfterSeconds(user: Pick<User, 'lockedUntil'>): number {
  if (!user.lockedUntil) return 0;
  return Math.max(0, Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000));
}

/** Record a failed attempt; once the threshold is crossed, apply a backing-off lock. */
export async function registerFailedLogin(userId: string): Promise<void> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: { increment: 1 } },
    select: { failedLoginCount: true },
  });
  if (user.failedLoginCount >= FAIL_THRESHOLD) {
    const overage = user.failedLoginCount - FAIL_THRESHOLD + 1;
    const lockMs = Math.min(BASE_LOCK_MS * overage, MAX_LOCK_MS);
    await prisma.user.update({
      where: { id: userId },
      data: { lockedUntil: new Date(Date.now() + lockMs) },
    });
  }
}

/** Clear counters after a successful authentication. */
export async function registerSuccessfulLogin(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginCount: 0, lockedUntil: null },
  });
}
