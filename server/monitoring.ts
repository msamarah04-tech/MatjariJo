import * as Sentry from '@sentry/node';
import { env } from './env.js';
import { logger } from './logger.js';

/**
 * Server-side error tracking. Disabled unless SENTRY_DSN is set, so development
 * and tests run without any external dependency.
 */
export const sentryEnabled = Boolean(env.SENTRY_DSN);

export function initMonitoring() {
  if (!sentryEnabled) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    // No performance tracing for now — errors only.
    tracesSampleRate: 0,
  });
  logger.info('Sentry error tracking enabled');
}

/** Report an unexpected (5xx) error; no-op when Sentry is disabled. */
export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (!sentryEnabled) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
