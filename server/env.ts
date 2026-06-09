import 'dotenv/config';
import { z } from 'zod';

const DEFAULT_JWT_SECRET = 'dev-only-change-this-jwt-secret-before-production';
const DEFAULT_PLATFORM_PASSWORD = 'ChangeMe123!';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().default('file:./dev.db'),
  JWT_SECRET: z.string().min(24).default(DEFAULT_JWT_SECRET),
  // Access tokens are short-lived; sessions stay alive via the refresh token.
  JWT_EXPIRES_IN: z.string().default('30m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  // Signs the httpOnly refresh cookie. Required in production (see fail-closed below).
  COOKIE_SECRET: z.string().min(16).optional(),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().default('http://localhost:3000'),
  REQUEST_BODY_LIMIT: z.string().default('50mb'),
  ALLOW_OWNER_REGISTRATION: z.enum(['true', 'false']).default('false'),
  INITIAL_PLATFORM_EMAIL: z.string().email().default('owner@plinth.local'),
  INITIAL_PLATFORM_USERNAME: z.string().min(3).default('platform-admin'),
  INITIAL_PLATFORM_PASSWORD: z.string().min(8).default(DEFAULT_PLATFORM_PASSWORD),
  INITIAL_PLATFORM_NAME: z.string().default('Platform Owner'),
});

export const env = envSchema.parse(process.env);

function uniqueChars(value: string) {
  return new Set(value).size;
}

/**
 * Fail-closed: in production, refuse to boot on insecure secrets or unchanged
 * seed credentials. Self-hosted operators get a single, explicit error listing
 * everything to fix rather than silently running with dev defaults.
 */
function assertProductionSafety(e: typeof env) {
  if (e.NODE_ENV !== 'production') return;
  const problems: string[] = [];

  if (!process.env.JWT_SECRET || e.JWT_SECRET === DEFAULT_JWT_SECRET) {
    problems.push('JWT_SECRET is missing or still the built-in development default.');
  } else if (e.JWT_SECRET.length < 32) {
    problems.push('JWT_SECRET must be at least 32 characters in production.');
  } else if (uniqueChars(e.JWT_SECRET) < 8) {
    problems.push('JWT_SECRET is too low-entropy (use a random 32+ character secret).');
  }

  if (e.INITIAL_PLATFORM_PASSWORD === DEFAULT_PLATFORM_PASSWORD) {
    problems.push('INITIAL_PLATFORM_PASSWORD is still the seeded default "ChangeMe123!".');
  }

  if (!process.env.COOKIE_SECRET) {
    problems.push('COOKIE_SECRET is required in production to sign the refresh cookie.');
  }

  if (e.FRONTEND_ORIGIN.split(',').some((o) => o.includes('localhost') || o.includes('127.0.0.1'))) {
    problems.push('FRONTEND_ORIGIN points at localhost; set it to the real frontend origin.');
  }

  if (problems.length > 0) {
    throw new Error(
      `Refusing to boot in production with insecure configuration:\n  - ${problems.join('\n  - ')}`,
    );
  }
}

assertProductionSafety(env);

export const isProduction = env.NODE_ENV === 'production';
export const cookieSecret = env.COOKIE_SECRET ?? `${env.JWT_SECRET}:cookie`;

for (const [key, value] of Object.entries(env)) {
  if (value !== undefined) process.env[key] = String(value);
}
