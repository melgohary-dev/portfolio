import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from '@saas/db';
import { createDb } from '@saas/db';
import {
  organizationMembers,
  organizations,
  orders,
  subscriptions,
  users,
} from '@saas/db/schema';
import { createRequestToken } from '@saas/shared';
import { createApp } from '../src/index.js';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/saas_test_db';
const API_AUTH_SECRET = 'test-api-auth-secret';

let db: ReturnType<typeof createDb>;
let app: ReturnType<typeof createApp>;
let ownerUserId: string;

// One org per suite so test order never matters: orgA=orders, orgB=isolation,
// orgStats=stats, orgBilling=billing.
const orgs = {
  a: '',
  b: '',
  stats: '',
  billing: '',
};

function signedRequest(
  path: string,
  init: (RequestInit & { orgId?: string; userId?: string; token?: string; ttlMs?: number }) = {},
) {
  const headers = new Headers(init.headers);
  const ttlMs = init.ttlMs ?? 60_000;
  const token =
    init.token ??
    (init.orgId
      ? createRequestToken({ userId: init.userId ?? ownerUserId, orgId: init.orgId }, API_AUTH_SECRET, ttlMs)
      : undefined);
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }
  const { orgId: _org, userId: _user, token: _token, ttlMs: _ttl, ...rest } = init;
  void _org;
  void _user;
  void _token;
  void _ttl;
  return app.request(path, { ...rest, headers });
}

async function createOrder(orgId: string, overrides: Record<string, unknown> = {}) {
  return signedRequest('/api/orders', {
    method: 'POST',
    orgId,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Alice Test',
      customerEmail: 'alice@test.local',
      amountCents: 1250,
      ...overrides,
    }),
  });
}

beforeAll(async () => {
  process.env.STRIPE_SECRET_KEY = '';
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.API_AUTH_SECRET = API_AUTH_SECRET;
  db = createDb(TEST_DATABASE_URL);
  app = createApp(db);

  await db.$client.query(
    'TRUNCATE subscriptions, orders, events, organization_members, sessions, password_reset_tokens, users, organizations CASCADE',
  );

  const [owner] = await db
    .insert(users)
    .values({ email: 'owner@test.local', name: 'Owner' })
    .returning({ id: users.id });
  ownerUserId = owner!.id;

  for (const [key, name] of [
    ['a', 'Org A'],
    ['b', 'Org B'],
    ['stats', 'Org Stats'],
    ['billing', 'Org Billing'],
  ] as const) {
    const [row] = await db
      .insert(organizations)
      .values({ name, slug: `${key}-${randomUUID().slice(0, 8)}` })
      .returning({ id: organizations.id });
    orgs[key] = row!.id;
    await db.insert(organizationMembers).values({
      organizationId: orgs[key],
      userId: ownerUserId,
      role: 'owner',
    });
  }
});

describe('auth guard', () => {
  it('rejects requests without a bearer token', async () => {
    const res = await signedRequest('/api/orders');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a malformed token', async () => {
    const res = await signedRequest('/api/orders', { token: 'not-a-token' });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a token signed with the wrong secret', async () => {
    const token = createRequestToken({ userId: ownerUserId, orgId: orgs.a }, 'wrong-secret');
    const res = await signedRequest('/api/orders', { token });
    expect(res.status).toBe(401);
  });

  it('rejects an expired token', async () => {
    const res = await signedRequest('/api/orders', { orgId: orgs.a, ttlMs: -1 });
    expect(res.status).toBe(401);
  });

  it('fails closed when API_AUTH_SECRET is unset', async () => {
    const previous = process.env.API_AUTH_SECRET;
    process.env.API_AUTH_SECRET = '';
    try {
      const token = createRequestToken({ userId: ownerUserId, orgId: orgs.a }, API_AUTH_SECRET);
      const res = await signedRequest('/api/orders', { token });
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error.code).toBe('AUTH_NOT_CONFIGURED');
    } finally {
      process.env.API_AUTH_SECRET = previous;
    }
  });
});

describe('health', () => {
  it('reports healthy without a token', async () => {
    const res = await signedRequest('/health');
    expect(res.status).toBe(200);
  });

  it('skips bearer auth for the Stripe webhook', async () => {
    // The webhook authenticates via stripe-signature; without a token the
    // handler still runs and rejects for the missing signature (400), proving
    // the middleware skipped it rather than returning 401.
    const res = await signedRequest('/api/billing/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('MISSING_SIGNATURE');
  });
});

describe('orders', () => {
  it('creates an order with defaults', async () => {
    const res = await createOrder(orgs.a);
    expect(res.status).toBe(201);
    const order = await res.json();
    expect(order.tenantId).toBe(orgs.a);
    expect(order.status).toBe('pending');
    expect(order.currency).toBe('USD');
    expect(order.createdBy).toBe(ownerUserId);
    expect(order.lineItems).toEqual([]);
  });

  it('rejects an invalid body', async () => {
    const res = await signedRequest('/api/orders', {
      method: 'POST',
      orgId: orgs.a,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ customerEmail: 'bad', amountCents: -1 }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('lists orders for the tenant', async () => {
    const res = await signedRequest('/api/orders', { orgId: orgs.a });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.orders[0].customerName).toBe('Alice Test');
  });

  it('supports status filtering with a filter-aware total', async () => {
    const res = await signedRequest('/api/orders?status=paid', { orgId: orgs.a });
    const body = await res.json();
    expect(body.total).toBe(0);
    expect(body.orders).toHaveLength(0);
  });

  it('keeps tenants isolated via the token org claim', async () => {
    const res = await signedRequest('/api/orders', { orgId: orgs.b });
    const body = await res.json();
    expect(body.total).toBe(0);
    expect(body.orders).toHaveLength(0);
  });
});

describe('realtime', () => {
  it('opens an SSE stream for a verified tenant', async () => {
    const controller = new AbortController();
    const res = await signedRequest('/api/orders/stream', {
      orgId: orgs.a,
      signal: controller.signal,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/event-stream');
    controller.abort();
  });

  it('rejects the stream without a token', async () => {
    const res = await signedRequest('/api/orders/stream');
    expect(res.status).toBe(401);
  });
});

describe('stats', () => {
  it('counts pending orders and zero revenue initially', async () => {
    const created = await createOrder(orgs.stats);
    expect(created.status).toBe(201);

    const res = await signedRequest('/api/stats', { orgId: orgs.stats });
    expect(res.status).toBe(200);
    const stats = await res.json();
    expect(stats.totalOrders).toBe(1);
    expect(stats.revenueCents).toBe(0);
    const breakdown = Object.fromEntries(
      stats.statusBreakdown.map((s: { status: string; count: number }) => [s.status, s.count]),
    );
    expect(breakdown.pending).toBe(1);
  });

  it('counts revenue only for paid orders', async () => {
    const [row] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.tenantId, orgs.stats))
      .limit(1);
    await db
      .update(orders)
      .set({ status: 'paid' })
      .where(and(eq(orders.id, row!.id), eq(orders.tenantId, orgs.stats)));

    const res = await signedRequest('/api/stats', { orgId: orgs.stats });
    const stats = await res.json();
    expect(stats.revenueCents).toBe(1250);
    expect(stats.avgOrderValueCents).toBe(1250);
  });
});

describe('billing', () => {
  it('returns a mock-mode overview with plans', async () => {
    const res = await signedRequest('/api/billing', { orgId: orgs.billing });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.mode).toBe('mock');
    expect(body.plans.map((p: { id: string }) => p.id)).toEqual(['free', 'pro']);
    expect(body.subscription).toBeNull();
  });

  it('activates a mock pro subscription', async () => {
    const res = await signedRequest('/api/billing/checkout/complete', {
      method: 'POST',
      orgId: orgs.billing,
      body: JSON.stringify({ plan: 'pro' }),
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(200);

    const [sub] = await db
      .select({ plan: subscriptions.plan })
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, orgs.billing));
    expect(sub?.plan).toBe('pro');

    const overview = await signedRequest('/api/billing', { orgId: orgs.billing });
    const body = await overview.json();
    expect(body.subscription.plan).toBe('pro');
    expect(body.subscription.status).toBe('active');
  });

  it('rejects purchasing the free plan', async () => {
    const res = await signedRequest('/api/billing/checkout/complete', {
      method: 'POST',
      orgId: orgs.billing,
      body: JSON.stringify({ plan: 'free' }),
      headers: { 'content-type': 'application/json' },
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_PLAN');
  });

  it('cancels a mock subscription down to free/canceled', async () => {
    const res = await signedRequest('/api/billing/cancel', {
      method: 'POST',
      orgId: orgs.billing,
    });
    expect(res.status).toBe(200);

    const [sub] = await db
      .select({ plan: subscriptions.plan, status: subscriptions.status })
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, orgs.billing));
    expect(sub?.plan).toBe('free');
    expect(sub?.status).toBe('canceled');
  });
});
