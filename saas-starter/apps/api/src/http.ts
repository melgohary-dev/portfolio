import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { ZodError } from 'zod';
import { logger, type AppEnv } from './logger.js';

export class ApiError extends Error {
  constructor(
    public readonly status: ContentfulStatusCode,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function apiErrorEnvelope(code: string, message: string, details?: unknown) {
  return {
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
}

export function formatZodIssues(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

export function validationHook(
  result: { success: boolean; error?: unknown },
  c: Context,
): Response | undefined {
  if (result.success) {
    return undefined;
  }
  const error = result.error instanceof ZodError ? result.error : undefined;
  return c.json(
    apiErrorEnvelope(
      'VALIDATION_ERROR',
      'Invalid request',
      error ? formatZodIssues(error) : result.error,
    ),
    400,
  );
}

export function errorHandler(err: Error, c: Context<AppEnv>): Response {
  const requestId = c.get('requestId');
  if (err instanceof ApiError) {
    logger.warn(
      {
        requestId,
        method: c.req.method,
        path: c.req.path,
        status: err.status,
        code: err.code,
      },
      err.message,
    );
    return c.json(apiErrorEnvelope(err.code, err.message, err.details), err.status);
  }
  logger.error({ requestId, method: c.req.method, path: c.req.path, err }, 'unhandled error');
  return c.json(apiErrorEnvelope('INTERNAL_ERROR', 'Internal server error'), 500);
}

export function notFoundHandler(c: Context): Response {
  return c.json(apiErrorEnvelope('NOT_FOUND', 'Route not found'), 404);
}
