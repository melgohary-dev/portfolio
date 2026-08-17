import Stripe from 'stripe';
import { eq, getDatabase } from '@saas/db';
import { subscriptions } from '@saas/db/schema';
import type { SubscriptionStatus } from '@saas/shared';
import { BillingError } from './errors.js';
import { appUrl, getPlans, isMockMode, type PlanId } from './plans.js';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  _stripe = new Stripe(key);
  return _stripe;
}

export type SubscriptionRow = typeof subscriptions.$inferSelect;

export type AppliedSubscription = {
  tenantId: string;
  plan: PlanId;
  status: SubscriptionStatus;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  currentPeriodEnd?: Date | null;
};

export async function applySubscriptionFromStripe(input: AppliedSubscription): Promise<SubscriptionRow> {
  const db = getDatabase();
  const existing = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.tenantId, input.tenantId))
    .limit(1);
  if (existing[0]) {
    const [row] = await db
      .update(subscriptions)
      .set({
        plan: input.plan,
        status: input.status,
        stripeCustomerId: input.stripeCustomerId ?? null,
        stripeSubscriptionId: input.stripeSubscriptionId ?? null,
        currentPeriodEnd: input.currentPeriodEnd ?? null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existing[0].id))
      .returning();
    if (!row) {
      throw new BillingError('SUBSCRIPTION_UPDATE_FAILED', 'subscription update returned no row');
    }
    return row;
  }
  const [row] = await db
    .insert(subscriptions)
    .values({
      tenantId: input.tenantId,
      plan: input.plan,
      status: input.status,
      stripeCustomerId: input.stripeCustomerId ?? null,
      stripeSubscriptionId: input.stripeSubscriptionId ?? null,
      currentPeriodEnd: input.currentPeriodEnd ?? null,
    })
    .returning();
  if (!row) {
    throw new BillingError('SUBSCRIPTION_INSERT_FAILED', 'subscription insert returned no row');
  }
  return row;
}

async function getSubscriptionByStripeCustomer(customerId: string): Promise<SubscriptionRow | null> {
  const [row] = await getDatabase()
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeCustomerId, customerId))
    .limit(1);
  return row ?? null;
}

/**
 * Creates a Stripe checkout session for `planId`, using that plan's configured
 * Stripe price (getPlans()). Previously the Pro price was hardcoded, which made
 * plan-aware checkout impossible once more than one paid plan exists. In mock
 * mode (no Stripe key) the simulated checkout URL is returned instead.
 */
export async function createCheckoutSession(opts: {
  tenantId: string;
  customerEmail: string;
  planId: PlanId;
}): Promise<{ url: string; mode: 'live' | 'mock' }> {
  const plan = getPlans().find((p) => p.id === opts.planId);
  if (!plan) {
    throw new BillingError('INVALID_PLAN', `Unknown plan: ${opts.planId}`);
  }
  const stripe = getStripe();
  const priceId = plan.priceId;
  if (stripe && priceId) {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl()}/app/settings?upgraded=1`,
      cancel_url: `${appUrl()}/app/settings?checkout=cancelled`,
      client_reference_id: opts.tenantId,
      customer_email: opts.customerEmail,
      metadata: { plan: opts.planId },
    });
    if (!session.url) {
      throw new BillingError('CHECKOUT_URL_MISSING', 'Stripe checkout session returned no url');
    }
    return { url: session.url, mode: 'live' };
  }
  // No Stripe configured (mock mode) or no price for this plan yet: fall back
  // to the simulated checkout, which resolves the plan on completion.
  return { url: `${appUrl()}/checkout/simulated?plan=${opts.planId}`, mode: 'mock' };
}

export async function createPortalSession(opts: {
  tenantId: string;
}): Promise<{ url: string; mode: 'live' | 'mock' }> {
  const stripe = getStripe();
  const subscription = await getDatabase()
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.tenantId, opts.tenantId))
    .limit(1);
  if (stripe && subscription[0]?.stripeCustomerId) {
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription[0].stripeCustomerId,
      return_url: `${appUrl()}/app/settings`,
    });
    return { url: session.url, mode: 'live' };
  }
  return { url: `${appUrl()}/app/settings?mockPortal=1`, mode: 'mock' };
}

export async function completeMockCheckout(opts: {
  tenantId: string;
  planId: PlanId;
}): Promise<SubscriptionRow> {
  if (!isMockMode()) {
    throw new BillingError('MOCK_DISABLED', 'Mock checkout is disabled when Stripe is configured');
  }
  if (opts.planId === 'free') {
    // The free plan cannot be "purchased" — downgrades go through cancellation.
    throw new BillingError('INVALID_PLAN', 'The free plan cannot be purchased');
  }
  const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return applySubscriptionFromStripe({
    tenantId: opts.tenantId,
    plan: opts.planId,
    status: 'active',
    stripeCustomerId: `cus_mock_${opts.tenantId.slice(0, 12)}`,
    stripeSubscriptionId: `sub_mock_${opts.tenantId.slice(0, 12)}`,
    currentPeriodEnd,
  });
}

export async function cancelMockSubscription(opts: {
  tenantId: string;
}): Promise<SubscriptionRow> {
  if (!isMockMode()) {
    throw new BillingError(
      'MOCK_DISABLED',
      'Cancellations happen in the Stripe customer portal when configured',
    );
  }
  return applySubscriptionFromStripe({
    tenantId: opts.tenantId,
    plan: 'free',
    status: 'canceled',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    currentPeriodEnd: null,
  });
}

function subscriptionPeriodEnd(sub: Stripe.Subscription): Date | null {
  const billUntil = sub.billing_schedules?.[0]?.bill_until;
  const timestamp = billUntil?.timestamp ?? billUntil?.computed_timestamp;
  if (timestamp) {
    return new Date(timestamp * 1000);
  }
  const legacy = (sub as unknown as { current_period_end?: number }).current_period_end;
  return legacy ? new Date(legacy * 1000) : null;
}

export async function handleStripeWebhook(opts: {
  payload: string;
  signature: string;
}): Promise<string> {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    throw new BillingError('WEBHOOK_NOT_CONFIGURED', 'Stripe webhooks are not configured');
  }
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(opts.payload, opts.signature, secret);
  } catch {
    throw new BillingError('INVALID_SIGNATURE', 'Stripe signature verification failed');
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const tenantId = session.client_reference_id;
      if (!tenantId) {
        break;
      }
      const customerId =
        typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id ?? null;
      let currentPeriodEnd: Date | null = null;
      if (subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        currentPeriodEnd = subscriptionPeriodEnd(sub);
      }
      await applySubscriptionFromStripe({
        tenantId,
        plan: 'pro',
        status: 'active',
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        currentPeriodEnd,
      });
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
      const row = customerId ? await getSubscriptionByStripeCustomer(customerId) : null;
      if (!row) {
        break;
      }
      const cancelled = event.type === 'customer.subscription.deleted' || sub.status === 'canceled';
      await applySubscriptionFromStripe({
        tenantId: row.tenantId,
        plan: cancelled ? 'free' : 'pro',
        status: sub.status as SubscriptionStatus,
        stripeCustomerId: customerId,
        stripeSubscriptionId: sub.id,
        currentPeriodEnd: subscriptionPeriodEnd(sub),
      });
      break;
    }
  }
  return event.type;
}
