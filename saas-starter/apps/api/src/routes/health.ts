import type { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '../logger.js';

export function registerHealth(app: OpenAPIHono<AppEnv>) {
  // Liveness probe for orchestration (docker-compose, K8s, uptime monitors).
  // Intentionally public and outside the bearer-token auth (see auth.ts) —
  // health checks have no user context.
  app.get('/health', (c) => c.json({ ok: true, ts: new Date().toISOString() }));
}
