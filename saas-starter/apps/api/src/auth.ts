import { createMiddleware } from 'hono/factory';
import { verifyRequestToken } from '@saas/shared';
import { ApiError } from './http.js';
import type { AppEnv } from './logger.js';

/**
 * Endpoints that authenticate another way and must skip the bearer check:
 * - `/health` — liveness probe for orchestration, intentionally public.
 * - `/api/billing/webhook` — Stripe authenticates via the `stripe-signature`
 *   header inside the handler.
 */
const PUBLIC_PATHS = new Set(['/health', '/api/billing/webhook']);

/**
 * Authenticates every `/api/*` request via an HMAC-signed bearer token (see
 * packages/shared/src/request-token.ts). The web proxy signs the token after
 * resolving the org from the Auth.js session, so the API can trust the claimed
 * { userId, orgId } without ever reading a client-supplied `x-tenant-id`.
 *
 * Trust model: anyone with `API_AUTH_SECRET` can mint tokens for any
 * user/org — the secret must be kept private and identical across web+API.
 * The API fails closed: no secret configured or no valid token ⇒ rejected.
 */
export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const path = c.req.path;
  if (PUBLIC_PATHS.has(path)) {
    return next();
  }

  const secret = process.env.API_AUTH_SECRET;
  if (!secret) {
    throw new ApiError(500, 'AUTH_NOT_CONFIGURED', 'API_AUTH_SECRET is not set');
  }

  const header = c.req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
  if (!token) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Missing bearer token');
  }

  let identity: { userId: string; orgId: string };
  try {
    identity = verifyRequestToken(token, secret);
  } catch {
    // Same envelope for malformed, tampered and expired tokens — no hints.
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired bearer token');
  }

  c.set('userId', identity.userId);
  c.set('tenantId', identity.orgId);
  await next();
});
