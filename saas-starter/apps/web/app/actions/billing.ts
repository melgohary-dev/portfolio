'use server';

import { redirect } from 'next/navigation';
import { auth } from '@saas/auth';
import { apiFetch } from '@/lib/api';

export async function createCheckoutAction(plan: 'free' | 'pro') {
  const session = await auth();
  const result = await apiFetch<{ url: string }>('billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ plan, email: session?.user?.email ?? undefined }),
  });
  redirect(result.url);
}

export async function createPortalAction() {
  const result = await apiFetch<{ url: string }>('billing/portal', { method: 'POST' });
  redirect(result.url);
}

export async function completeMockCheckoutAction() {
  await apiFetch<{ ok: boolean }>('billing/checkout/complete', {
    method: 'POST',
    body: JSON.stringify({ plan: 'pro' }),
  });
  redirect('/app/settings?upgraded=1');
}

export async function cancelMockSubscriptionAction() {
  await apiFetch<{ ok: boolean }>('billing/cancel', { method: 'POST' });
  redirect('/app/settings?cancelled=1');
}
