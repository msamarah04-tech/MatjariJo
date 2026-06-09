import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../errors.js';

/**
 * Self-contained, in-memory fixed-window rate limiter. No external store — fine
 * for a single self-hosted process. (A future multi-process deploy would swap the
 * Map for a shared store behind this same interface.)
 */
type Bucket = { count: number; resetAt: number };

export function rateLimit(options: {
  windowMs: number;
  max: number;
  keyFn?: (req: Request) => string;
  message?: string;
}) {
  const { windowMs, max, message } = options;
  const keyFn = options.keyFn ?? ((req) => req.ip ?? 'unknown');
  const buckets = new Map<string, Bucket>();

  // Purge expired buckets so memory stays bounded; unref so it never blocks exit.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
  }, windowMs);
  sweep.unref?.();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyFn(req);
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return next(new ApiError(429, message ?? 'Too many requests. Please slow down.', 'RATE_LIMITED'));
    }
    return next();
  };
}

/** Login: tight IP cap to blunt credential-stuffing (per-account lockout is separate). */
export const loginRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 12,
  message: 'Too many login attempts from this address. Try again shortly.',
});

/** Public write endpoints (analytics capture, shop-request submission, checkout). */
export const publicWriteRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  message: 'Too many requests. Please slow down.',
});
