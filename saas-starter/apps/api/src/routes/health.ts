import type { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '../logger.js';
import type { Database } from '@saas/db';
import { sql } from 'drizzle-orm';

export function registerHealth(app: OpenAPIHono<AppEnv>, db?: Database) {
  // Liveness probe for orchestration (docker-compose, K8s, uptime monitors).
  // Intentionally public and outside the bearer-token auth (see auth.ts) —
  // health checks have no user context.
  app.get('/health', async (c) => {
    let dbOk = true;
    if (db) {
      try {
        await db.execute(sql`SELECT 1`);
      } catch {
        dbOk = false;
      }
    }
    return c.json(
      { ok: dbOk, db: dbOk ? 'connected' : 'unreachable', ts: new Date().toISOString() },
      dbOk ? 200 : 503,
    );
  });
}
