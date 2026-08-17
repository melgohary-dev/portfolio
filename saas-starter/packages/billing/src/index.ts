import type { PlanConfig, PlanId } from './plans.js';
import type { SubscriptionStatus } from '@saas/shared';

export { getPlans, isMockMode, type PlanConfig, type PlanId } from './plans.js';
export { BillingError } from './errors.js';

export type CheckoutResult = { url: string; mode: 'live' | 'mock' };

export async function createCheckoutSession(opts: {
  tenantId: string;
  customerEmail: string;
  planId: PlanId;
}): Promise<CheckoutResult> {
  const { createCheckoutSession } = await import('./node.js');
  return createCheckoutSession(opts);
}

export async function createPortalSession(opts: {
  tenantId: string;
}): Promise<CheckoutResult> {
  const { createPortalSession } = await import('./node.js');
  return createPortalSession(opts);
}

export async function completeMockCheckout(opts: {
  tenantId: string;
  planId: PlanId;
}) {
  const { completeMockCheckout } = await import('./node.js');
  return completeMockCheckout(opts);
}

export async function cancelMockSubscription(opts: { tenantId: string }) {
  const { cancelMockSubscription } = await import('./node.js');
  return cancelMockSubscription(opts);
}

export async function handleStripeWebhook(opts: {
  payload: string;
  signature: string;
}): Promise<string> {
  const { handleStripeWebhook } = await import('./node.js');
  return handleStripeWebhook(opts);
}

export type { SubscriptionRow } from './node.js';

export type BillingOverview = {
  mode: 'live' | 'mock';
  plans: PlanConfig[];
  subscription: {
    plan: PlanId;
    status: SubscriptionStatus;
    currentPeriodEnd: string | null;
  } | null;
};
