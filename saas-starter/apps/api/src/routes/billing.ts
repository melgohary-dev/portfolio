import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';
import {
  BillingError,
  cancelMockSubscription,
  completeMockCheckout,
  createCheckoutSession,
  createPortalSession,
  getPlans,
  handleStripeWebhook,
  isMockMode,
  type BillingOverview,
  type CheckoutResult,
} from '@saas/billing';
import { tenantScoped, type Database } from '@saas/db';
import {
  ApiErrorSchema,
  BillingOverviewSchema,
  CheckoutRequestSchema,
  CheckoutResponseSchema,
  PortalResponseSchema,
  type SubscriptionStatus,
} from '@saas/shared';
import { ApiError } from '../http.js';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { AppEnv } from '../logger.js';

const okSchema = z.object({ ok: z.boolean() });

/** Maps @saas/billing domain errors to the API's stable error envelope. */
async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof BillingError) {
      throw new ApiError(err.status as ContentfulStatusCode, err.code, err.message);
    }
    throw err;
  }
}

export function registerBilling(app: OpenAPIHono<AppEnv>, db: Database) {
  const overviewRoute = createRoute({
    method: 'get',
    path: '/api/billing',
    tags: ['billing'],
    responses: {
      200: {
        description: 'Billing overview',
        content: { 'application/json': { schema: BillingOverviewSchema } },
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

  app.openapi(overviewRoute, async (c) => {
    const tenantId = c.get('tenantId');
    const subscription = await tenantScoped(db, tenantId).subscriptions.get();
    const overview: BillingOverview = {
      mode: isMockMode() ? 'mock' : 'live',
      plans: getPlans(),
      subscription: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status as SubscriptionStatus,
            currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
          }
        : null,
    };
    return c.json(overview, 200);
  });

  const checkoutRoute = createRoute({
    method: 'post',
    path: '/api/billing/checkout',
    tags: ['billing'],
    request: {
      body: {
        content: { 'application/json': { schema: CheckoutRequestSchema } },
      },
    },
    responses: {
      200: {
        description: 'Checkout URL',
        content: { 'application/json': { schema: CheckoutResponseSchema } },
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

  app.openapi(checkoutRoute, async (c) => {
    const tenantId = c.get('tenantId');
    const body = c.req.valid('json');
    // Live checkout needs a real email for the Stripe customer; silently
    // falling back to a placeholder would bill the wrong address.
    const customerEmail = body.email;
    if (!customerEmail && !isMockMode()) {
      throw new ApiError(400, 'EMAIL_REQUIRED', 'Customer email is required for checkout');
    }
    const result: CheckoutResult = await guard(() =>
      createCheckoutSession({
        tenantId,
        customerEmail: customerEmail ?? 'mock@example.com',
        planId: body.plan,
      }),
    );
    return c.json(result, 200);
  });

  const portalRoute = createRoute({
    method: 'post',
    path: '/api/billing/portal',
    tags: ['billing'],
    responses: {
      200: {
        description: 'Customer portal URL',
        content: { 'application/json': { schema: PortalResponseSchema } },
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

  app.openapi(portalRoute, async (c) => {
    const tenantId = c.get('tenantId');
    const result = await guard(() => createPortalSession({ tenantId }));
    return c.json(result, 200);
  });

  const completeMockRoute = createRoute({
    method: 'post',
    path: '/api/billing/checkout/complete',
    tags: ['billing'],
    request: {
      body: {
        content: { 'application/json': { schema: CheckoutRequestSchema } },
      },
    },
    responses: {
      200: {
        description: 'Mock checkout applied',
        content: { 'application/json': { schema: okSchema } },
      },
      400: {
        description: 'Mock checkout disabled or validation error',
        content: { 'application/json': { schema: ApiErrorSchema } },
      },
      401: {
        description: 'Missing or invalid bearer token',
        content: { 'application/json': { schema: ApiErrorSchema } },
      },
    },
  });

  app.openapi(completeMockRoute, async (c) => {
    if (!isMockMode()) {
      throw new ApiError(400, 'MOCK_DISABLED', 'Stripe is configured; use real checkout');
    }
    const tenantId = c.get('tenantId');
    const body = c.req.valid('json');
    await guard(() => completeMockCheckout({ tenantId, planId: body.plan }));
    return c.json({ ok: true }, 200);
  });

  const cancelRoute = createRoute({
    method: 'post',
    path: '/api/billing/cancel',
    tags: ['billing'],
    responses: {
      200: {
        description: 'Mock subscription cancelled',
        content: { 'application/json': { schema: okSchema } },
      },
      400: {
        description: 'Mock cancel disabled or validation error',
        content: { 'application/json': { schema: ApiErrorSchema } },
      },
      401: {
        description: 'Missing or invalid bearer token',
        content: { 'application/json': { schema: ApiErrorSchema } },
      },
    },
  });

  app.openapi(cancelRoute, async (c) => {
    if (!isMockMode()) {
      throw new ApiError(400, 'MOCK_DISABLED', 'Stripe is configured; cancel in the portal');
    }
    const tenantId = c.get('tenantId');
    await guard(() => cancelMockSubscription({ tenantId }));
    return c.json({ ok: true }, 200);
  });

  // Raw route: Stripe authenticates via the `stripe-signature` header, not a
  // bearer token, so this is excluded from authMiddleware (see auth.ts).
  app.post('/api/billing/webhook', async (c) => {
    const payload = await c.req.text();
    const signature = c.req.header('stripe-signature');
    if (!signature) {
      throw new ApiError(400, 'MISSING_SIGNATURE', 'Missing stripe-signature header');
    }
    const type = await handleStripeWebhook({ payload, signature });
    return c.json({ received: type }, 200);
  });
}
