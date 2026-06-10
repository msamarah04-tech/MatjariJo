import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger.js';
import { captureError } from './monitoring.js';

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code = 'API_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const notFound = (message = 'Not found') => new ApiError(404, message, 'NOT_FOUND');
export const forbidden = (message = 'Forbidden') => new ApiError(403, message, 'FORBIDDEN');
export const unauthorized = (message = 'Unauthorized') => new ApiError(401, message, 'UNAUTHORIZED');
export const conflict = (message = 'Conflict') => new ApiError(409, message, 'CONFLICT');
export const badRequest = (message = 'Bad request') => new ApiError(400, message, 'BAD_REQUEST');

function isPayloadTooLarge(error: unknown): error is { type?: string; limit?: number } {
  return typeof error === 'object'
    && error !== null
    && 'type' in error
    && (error as { type?: string }).type === 'entity.too.large';
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        issues: error.issues,
      },
    });
  }

  if (isPayloadTooLarge(error)) {
    return res.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: `Request body is too large. Increase REQUEST_BODY_LIMIT if this upload is expected.`,
      },
    });
  }

  if (error instanceof ApiError) {
    return res.status(error.status).json({ error: { code: error.code, message: error.message } });
  }

  // Unexpected: log with the request-scoped logger (includes the request id) so the
  // 500 can be traced, but never leak internals to the client.
  const log = (req as Request & { log?: typeof logger }).log ?? logger;
  log.error({ err: error }, 'Unhandled error');
  captureError(error, { method: req.method, path: req.path, requestId: res.getHeader('X-Request-Id') });
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
}
