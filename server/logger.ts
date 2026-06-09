import { randomUUID } from 'node:crypto';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { env, isProduction } from './env.js';

/**
 * Self-hosted structured logging (pino). Pretty in dev, JSON in production. No
 * external log shipping — that's deferred. Sensitive fields are redacted.
 */
const usePretty = !isProduction && env.NODE_ENV !== 'test';
export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : isProduction ? 'info' : 'debug',
  redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
  transport: usePretty
    ? {
        target: 'pino-pretty',
        // Dev: one compact line per request. The full req/res objects stay in the log
        // record (so you can switch them back on) but aren't printed.
        options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname,req,res,responseTime,reqId' },
      }
    : undefined,
});

/** Request logging with a per-request id (echoed back as X-Request-Id). */
export const httpLogger = pinoHttp({
  logger,
  // Skip CORS preflight noise.
  autoLogging: { ignore: (req) => req.method === 'OPTIONS' },
  genReqId: (req, res) => {
    const incoming = req.headers['x-request-id'];
    const id = (typeof incoming === 'string' && incoming) || randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  // Compact, useful one-liner: "GET /api/bootstrap 200 4ms · <reqId>".
  customSuccessMessage: (req, res, responseTime) =>
    `${req.method} ${(req as { url?: string }).url ?? ''} ${res.statusCode} ${responseTime}ms · ${(req as { id?: string }).id ?? ''}`,
  customErrorMessage: (req, res, err) =>
    `${req.method} ${(req as { url?: string }).url ?? ''} ${res.statusCode} ${err.message} · ${(req as { id?: string }).id ?? ''}`,
});
