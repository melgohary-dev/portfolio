import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { OpenAPIHono } from '@hono/zod-openapi';
import { serve as honoServe } from '@hono/node-server';
import { pathToFileURL } from 'node:url';
import { createDb, defaultDatabaseUrl, type Database } from '@saas/db';
import { authMiddleware } from './auth.js';
import { ApiError, errorHandler, notFoundHandler, validationHook } from './http.js';
import { logger, type AppEnv } from './logger.js';
import { registerBilling } from './routes/billing.js';
import { registerHealth } from './routes/health.js';
import { registerOrders } from './routes/orders.js';
import { registerStats } from './routes/stats.js';
import { rateLimit } from './rate-limit.js';

export function createApp(db: Database) {
  const app = new OpenAPIHono<AppEnv>({
    // zod-openapi validates route params/bodies/query in the defaultHook —
    // AFTER middleware runs, so auth failures never reach schema validation.
    defaultHook: validationHook,
  });

  // Request-id correlation + completion logging. The log line lives in a
  // finally block so erroring requests are still recorded with their real
  // status (ApiError status or 500) instead of silently dropping the entry.
  // `x-trace-id` is forwarded from the proxy for cross-service tracing.
  app.use('*', async (c, next) => {
    const started = Date.now();
    const requestId = c.req.header('x-request-id') ?? randomUUID();
    c.set('requestId', requestId);
    c.header('x-request-id', requestId);
    let status = 500;
    try {
      await next();
      status = c.res.status;
    } catch (err) {
      status = err instanceof ApiError ? err.status : 500;
      throw err;
    } finally {
      logger.info(
        {
          requestId,
          method: c.req.method,
          path: c.req.path,
          status,
          ms: Date.now() - started,
          tenantId: c.get('tenantId') ?? undefined,
          traceId: c.req.header('x-trace-id') ?? undefined,
        },
        'request completed',
      );
    }
  });

  // Rate limit all API routes (except health).
  app.use('/api/*', rateLimit({ windowMs: 60_000, max: 120 }));

  // Bearer-token auth for every /api route (see auth.ts for the trust model).
  app.use('*', authMiddleware);

  app.onError(errorHandler);
  app.notFound(notFoundHandler);

  registerHealth(app, db);
  registerBilling(app, db);
  registerOrders(app, db);
  registerStats(app, db);

  app.doc('/api/openapi.json', {
    openapi: '3.1.0',
    info: {
      title: 'SaaS Starter API',
      version: '0.1.0',
    },
  });

  /**
   * Non-OpenAPI routes (documented here instead of in the spec):
   * - GET  /health              — liveness probe, intentionally unauthenticated.
   * - GET  /api/orders/stream   — SSE fan-out; kept as a raw route because the
   *   infinite streaming response does not fit the openapi response model.
   * - POST /api/billing/webhook — Stripe webhook; authenticated by the Stripe
   *   `stripe-signature` header, not the bearer token.
   */
  return app;
}

export function serve(port = Number(process.env.PORT ?? 4000)) {
  const db = createDb(defaultDatabaseUrl());
  const app = createApp(db);
  const server = honoServe({ fetch: app.fetch, port });
  console.log(`SaaS API listening on http://localhost:${port}`);

  const shutdown = () => {
    console.log('Shutting down...');
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 5000);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return server;
}

// Self-execution detection: `tsx src/index.ts` / `node dist/index.js` run the
// server; importing `createApp` from tests must not. We compare the module URL
// with the entry point path instead of relying on an env flag.
const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  serve();
}
