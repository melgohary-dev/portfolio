import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';
import { tenantScoped, type Database } from '@saas/db';
import { ApiErrorSchema, StatsResponseSchema } from '@saas/shared';
import type { AppEnv } from '../logger.js';

export function registerStats(app: OpenAPIHono<AppEnv>, db: Database) {
  const statsRoute = createRoute({
    method: 'get',
    path: '/api/stats',
    tags: ['stats'],
    request: {
      query: z.object({
        days: z.coerce.number().int().min(1).max(365).default(30),
      }),
    },
    responses: {
      200: {
        description: 'Aggregated stats for the tenant',
        content: { 'application/json': { schema: StatsResponseSchema } },
      },
      400: {
        description: 'Validation error',
        content: { 'application/json': { schema: ApiErrorSchema } },
      },
      401: {
        description: 'Missing or invalid bearer token',
        content: { 'application/json': { schema: ApiErrorSchema } },
      },
    },
  });

  app.openapi(statsRoute, async (c) => {
    const tenantId = c.get('tenantId');
    const result = await tenantScoped(db, tenantId).orders.stats();
    return c.json(result, 200);
  });
}
