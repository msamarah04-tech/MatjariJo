import type { PlanStatus, StorePlan } from './contract.js';

/**
 * Subscription plan definitions — the single source of truth for pricing and
 * limits. The server enforces caps and derives status from these; the SPA
 * renders the pricing page, request-form picker, and billing UI from them.
 */
export const TRIAL_DAYS = 14;

export const PLAN_ORDER: StorePlan[] = ['STARTER', 'GROWTH', 'SCALE'];

export const PLAN_DEFS: Record<StorePlan, { priceMonthlyJod: number; maxProducts: number | null }> = {
  STARTER: { priceMonthlyJod: 9, maxProducts: 25 },
  GROWTH: { priceMonthlyJod: 19, maxProducts: 150 },
  SCALE: { priceMonthlyJod: 39, maxProducts: null }, // unlimited
};

/**
 * PAST_DUE is never stored — it is derived from planPaidUntil on read, so an
 * expiring trial or lapsed payment needs no cron job to take effect.
 */
export function derivePlanStatus(stored: PlanStatus, paidUntilMs: number | null | undefined, now = Date.now()): PlanStatus {
  if (paidUntilMs != null && paidUntilMs < now) return 'PAST_DUE';
  return stored;
}

/** Calendar-month extension with end-of-month clamping (Jan 31 → Feb 28, not Mar 3). */
export function addOneMonth(from: Date): Date {
  const result = new Date(from.getTime());
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + 1);
  const daysInTarget = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, daysInTarget));
  return result;
}
