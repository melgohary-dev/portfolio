import { describe, it, expect } from 'vitest';
import {
  SubscriptionStatus,
  OrderStatusBreakdownSchema,
  OrdersListResponseSchema,
  DayCountSchema,
  StatsResponseSchema,
  ApiErrorSchema,
  CheckoutRequestSchema,
  CheckoutResponseSchema,
  PortalResponseSchema,
  PlanInfoSchema,
  SubscriptionInfoSchema,
  BillingOverviewSchema,
  Plan,
  OrderStatus,
} from '../src/schemas.js';

describe('SubscriptionStatus', () => {
  it('accepts all valid statuses', () => {
    const valid = ['active', 'trialing', 'canceled', 'past_due', 'incomplete', 'incomplete_expired', 'unpaid', 'paused'];
    for (const s of valid) {
      expect(SubscriptionStatus.parse(s)).toBe(s);
    }
  });

  it('rejects invalid status', () => {
    expect(() => SubscriptionStatus.parse('deleted')).toThrow();
  });
});

describe('OrderStatusBreakdownSchema', () => {
  it('accepts valid breakdown', () => {
    const data = { status: 'paid', count: 42 };
    expect(OrderStatusBreakdownSchema.parse(data)).toEqual(data);
  });

  it('rejects negative count', () => {
    expect(() => OrderStatusBreakdownSchema.parse({ status: 'paid', count: -1 })).toThrow();
  });

  it('rejects non-integer count', () => {
    expect(() => OrderStatusBreakdownSchema.parse({ status: 'paid', count: 1.5 })).toThrow();
  });
});

describe('OrdersListResponseSchema', () => {
  it('accepts valid response', () => {
    const data = {
      orders: [],
      total: 0,
    };
    expect(OrdersListResponseSchema.parse(data)).toEqual(data);
  });

  it('rejects negative total', () => {
    expect(() => OrdersListResponseSchema.parse({ orders: [], total: -1 })).toThrow();
  });
});

describe('DayCountSchema', () => {
  it('accepts valid day count', () => {
    const data = { date: '2026-08-14', count: 5 };
    expect(DayCountSchema.parse(data)).toEqual(data);
  });

  it('rejects negative count', () => {
    expect(() => DayCountSchema.parse({ date: '2026-08-14', count: -1 })).toThrow();
  });
});

describe('StatsResponseSchema', () => {
  it('accepts valid stats', () => {
    const data = {
      totalOrders: 100,
      revenueCents: 50000,
      avgOrderValueCents: 500,
      statusBreakdown: [{ status: 'paid', count: 80 }],
      last7Days: [{ date: '2026-08-14', count: 15 }],
    };
    expect(StatsResponseSchema.parse(data)).toEqual(data);
  });

  it('accepts empty arrays', () => {
    const data = {
      totalOrders: 0,
      revenueCents: 0,
      avgOrderValueCents: 0,
      statusBreakdown: [],
      last7Days: [],
    };
    expect(StatsResponseSchema.parse(data)).toEqual(data);
  });

  it('rejects missing required fields', () => {
    expect(() => StatsResponseSchema.parse({ totalOrders: 0 })).toThrow();
  });
});

describe('ApiErrorSchema', () => {
  it('accepts valid error', () => {
    const data = { error: { code: 'NOT_FOUND', message: 'Not found' } };
    expect(ApiErrorSchema.parse(data)).toEqual(data);
  });

  it('accepts error with details', () => {
    const data = { error: { code: 'VALIDATION_ERROR', message: 'Bad', details: { field: 'email' } } };
    expect(ApiErrorSchema.parse(data)).toEqual(data);
  });

  it('accepts error without details', () => {
    const data = { error: { code: 'ERR', message: 'msg' } };
    const parsed = ApiErrorSchema.parse(data);
    expect(parsed.error.details).toBeUndefined();
  });

  it('rejects missing code', () => {
    expect(() => ApiErrorSchema.parse({ error: { message: 'No code' } })).toThrow();
  });
});

describe('CheckoutRequestSchema', () => {
  it('accepts valid checkout with plan only', () => {
    expect(CheckoutRequestSchema.parse({ plan: 'pro' })).toEqual({ plan: 'pro' });
  });

  it('accepts checkout with optional email', () => {
    const data = { plan: 'free', email: 'a@b.com' };
    expect(CheckoutRequestSchema.parse(data)).toEqual(data);
  });

  it('rejects invalid plan', () => {
    expect(() => CheckoutRequestSchema.parse({ plan: 'enterprise' })).toThrow();
  });

  it('rejects invalid email format', () => {
    expect(() => CheckoutRequestSchema.parse({ plan: 'pro', email: 'not-email' })).toThrow();
  });
});

describe('CheckoutResponseSchema', () => {
  it('accepts live mode', () => {
    expect(CheckoutResponseSchema.parse({ url: 'https://checkout.stripe.com/xxx', mode: 'live' })).toBeDefined();
  });

  it('accepts mock mode', () => {
    expect(CheckoutResponseSchema.parse({ url: '/checkout/simulated', mode: 'mock' })).toBeDefined();
  });

  it('rejects invalid mode', () => {
    expect(() => CheckoutResponseSchema.parse({ url: '/', mode: 'test' })).toThrow();
  });
});

describe('PortalResponseSchema', () => {
  it('accepts valid portal response', () => {
    expect(PortalResponseSchema.parse({ url: 'https://billing.stripe.com/xxx', mode: 'live' })).toBeDefined();
  });

  it('rejects invalid mode', () => {
    expect(() => PortalResponseSchema.parse({ url: '/', mode: 'test' })).toThrow();
  });
});

describe('PlanInfoSchema', () => {
  it('accepts valid plan info', () => {
    const data = {
      id: 'pro',
      name: 'Pro',
      priceMonthlyCents: 2900,
      priceId: 'price_123',
      features: ['Unlimited orders', 'Priority support'],
      highlight: true,
    };
    expect(PlanInfoSchema.parse(data)).toEqual(data);
  });

  it('accepts plan with null price', () => {
    const data = {
      id: 'free',
      name: 'Free',
      priceMonthlyCents: null,
      priceId: null,
      features: ['Basic access'],
    };
    expect(PlanInfoSchema.parse(data)).toEqual(data);
  });

  it('accepts plan without highlight', () => {
    const data = {
      id: 'free',
      name: 'Free',
      priceMonthlyCents: null,
      priceId: null,
      features: [],
    };
    const parsed = PlanInfoSchema.parse(data);
    expect(parsed.highlight).toBeUndefined();
  });
});

describe('SubscriptionInfoSchema', () => {
  it('accepts valid subscription', () => {
    const data = { plan: 'pro', status: 'active', currentPeriodEnd: '2026-09-14T00:00:00Z' };
    expect(SubscriptionInfoSchema.parse(data)).toEqual(data);
  });

  it('accepts null currentPeriodEnd', () => {
    const data = { plan: 'free', status: 'active', currentPeriodEnd: null };
    expect(SubscriptionInfoSchema.parse(data)).toEqual(data);
  });

  it('rejects invalid subscription status', () => {
    expect(() => SubscriptionInfoSchema.parse({ plan: 'pro', status: 'deleted', currentPeriodEnd: null })).toThrow();
  });
});

describe('BillingOverviewSchema', () => {
  it('accepts valid billing overview', () => {
    const data = {
      mode: 'mock',
      plans: [
        { id: 'free', name: 'Free', priceMonthlyCents: null, priceId: null, features: [] },
        { id: 'pro', name: 'Pro', priceMonthlyCents: 2900, priceId: 'price_123', features: ['A'] },
      ],
      subscription: { plan: 'free', status: 'active', currentPeriodEnd: null },
    };
    expect(BillingOverviewSchema.parse(data)).toEqual(data);
  });

  it('accepts null subscription', () => {
    const data = {
      mode: 'live',
      plans: [],
      subscription: null,
    };
    expect(BillingOverviewSchema.parse(data)).toEqual(data);
  });

  it('rejects invalid mode', () => {
    expect(() => BillingOverviewSchema.parse({ mode: 'test', plans: [], subscription: null })).toThrow();
  });

  it('rejects invalid plan id in plans array', () => {
    expect(() =>
      BillingOverviewSchema.parse({
        mode: 'mock',
        plans: [{ id: 'enterprise', name: 'Ent', priceMonthlyCents: 100, priceId: 'x', features: [] }],
        subscription: null,
      }),
    ).toThrow();
  });
});
