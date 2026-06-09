import type { NextFunction, Request, Response } from 'express';

/** Wrap an async route handler so thrown/rejected errors reach the error middleware. */
export const asyncRoute = (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

export const normalizeCode = (code: string | undefined) => code?.trim().toUpperCase();

export function dateFromMs(value?: number | null) {
  return value ? new Date(value) : undefined;
}

export function shippingPatch(input?: { type: 'FLAT' | 'FREE_OVER' | 'PICKUP'; flatCents?: number; freeOverCents?: number }) {
  if (!input) return {};
  return {
    shippingType: input.type,
    shippingFlatCents: input.flatCents ?? null,
    freeOverCents: input.freeOverCents ?? null,
  };
}
