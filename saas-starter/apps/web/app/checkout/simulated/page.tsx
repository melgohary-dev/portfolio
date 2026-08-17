import { redirect } from 'next/navigation';
import { auth } from '@saas/auth';
import { apiFetch } from '@/lib/api';
import { SimulatedCheckout } from '@/components/simulated-checkout';
import type { BillingOverview } from '@saas/shared';

export default async function SimulatedCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }
  const params = await searchParams;
  const billing = await apiFetch<BillingOverview>('billing').catch(() => null);
  if (!billing || billing.mode === 'live') {
    redirect('/app/settings');
  }
  const plan = billing.plans.find((p) => p.id === params.plan) ?? billing.plans[0];
  if (!plan) {
    redirect('/app/settings');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <SimulatedCheckout plan={plan} />
    </main>
  );
}
