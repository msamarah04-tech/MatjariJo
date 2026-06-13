import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { router } from './routes/index.js';
import { errorHandler, notFound } from './errors.js';
import { cookieSecret, env, isProduction } from './env.js';
import { httpLogger } from './logger.js';

export const app = express();

// Correct client IPs (used by the rate limiter) when running behind a reverse proxy.
app.set('trust proxy', isProduction ? 1 : false);

// Structured request logging with a per-request id.
app.use(httpLogger);

// Security headers + strict CSP. styleSrc allows inline styles for printable
// order invoices; imgSrc allows data: URLs for store/product images.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
    },
  },
  // The SPA fetches this API cross-origin; access is governed by CORS below.
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const allowedOrigins = env.FRONTEND_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
// Tenant storefronts are served from per-store subdomains (borz.matjari.jo),
// so any direct subdomain of PUBLIC_BASE_DOMAIN is also a trusted origin.
const baseDomain = (env.PUBLIC_BASE_DOMAIN ?? '').replace(/^\.+|\.+$/g, '');
const isAllowedOrigin = (origin: string) => {
  if (allowedOrigins.includes(origin)) return true;
  if (!baseDomain) return false;
  try {
    const url = new URL(origin);
    if (isProduction && url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    return host === baseDomain || host.endsWith(`.${baseDomain}`);
  } catch {
    return false;
  }
};
app.use(cors({
  // No-origin requests (same-origin pages, curl, server-to-server) pass through
  // untouched, matching the previous array-based behavior.
  origin: (origin, callback) => callback(null, !origin || isAllowedOrigin(origin)),
  credentials: true,
}));

app.use(cookieParser(cookieSecret));
app.use(express.json({ limit: env.REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: env.REQUEST_BODY_LIMIT }));
app.use('/api', router);
app.use((_req, _res, next) => next(notFound('Route not found.')));
app.use(errorHandler);
