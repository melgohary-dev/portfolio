'use client';

import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { completeMockCheckoutAction } from '@/app/actions/billing';
import type { PlanInfo } from '@saas/shared';
import { useI18n } from '@/components/i18n-provider';

function PayButton() {
  const { pending } = useFormStatus();
  const { t } = useI18n();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-gray-900 py-3 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60"
    >
      {pending ? t('checkout.processing') : t('checkout.payNow')}
    </button>
  );
}

export function SimulatedCheckout({ plan }: { plan: PlanInfo }) {
  const { t } = useI18n();
  return (
    <div className="w-full max-w-md">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <span className="text-sm font-medium text-gray-600">{t('checkout.appName')}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
            {t('checkout.secure')}
          </span>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <h1 className="text-lg font-semibold">{t('checkout.planLabel', { plan: plan.name })}</h1>
            <p className="text-3xl font-semibold">
              {plan.priceMonthlyCents
                ? `$${(plan.priceMonthlyCents / 100).toFixed(2)}`
                : '$0'}
              <span className="text-sm font-normal text-gray-500">{t('checkout.perMonth')}</span>
            </p>
          </div>
          <ul className="space-y-1 text-sm text-gray-600">
            {plan.features.map((feature) => (
              <li key={feature}>— {feature}</li>
            ))}
          </ul>
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-center text-xs text-gray-500">
            {t('checkout.simulatedNote')}
          </div>
          <form action={completeMockCheckoutAction}>
            <PayButton />
          </form>
          <Link
            href="/app/settings"
            className="block text-center text-sm text-gray-500 underline"
          >
            {t('checkout.cancel')}
          </Link>
        </div>
      </div>
    </div>
  );
}
