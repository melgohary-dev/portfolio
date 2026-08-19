'use client';

import { useState } from 'react';
import {
  cancelMockSubscriptionAction,
  createCheckoutAction,
  createPortalAction,
} from '@/app/actions/billing';
import type { PlanInfo, SubscriptionInfo } from '@saas/shared';
import { useI18n } from '@/components/i18n-provider';
import { statusKey } from '@/lib/i18n';

export function BillingSettings({
  mode,
  plans,
  subscription,
}: {
  mode: 'live' | 'mock';
  plans: PlanInfo[];
  subscription: SubscriptionInfo | null;
}) {
  const currentPlan = subscription?.plan ?? 'free';
  const { t } = useI18n();
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {t(`plan.${currentPlan}`)}
          </p>
          {subscription?.status ? (
            <p className="ms-2 text-xs text-gray-600">
              ({t(statusKey(subscription.status))})
            </p>
          ) : null}
          {subscription?.currentPeriodEnd && !isNaN(Date.parse(subscription.currentPeriodEnd)) ? (
            <p className="text-xs text-gray-600">
              {t('billing.renews', {
                date: new Date(subscription.currentPeriodEnd).toLocaleDateString(),
              })}
            </p>
          ) : null}
        </div>
        {currentPlan === 'pro' ? (
          <div className="flex gap-2">
            <form action={createPortalAction}>
              <button
                type="submit"
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
              >
                {t('billing.manage')}
              </button>
            </form>
            {mode === 'mock' ? (
              confirmingCancel ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600">{t('billing.confirmCancel')}</span>
                  <form action={cancelMockSubscriptionAction}>
                    <button
                      type="submit"
                      className="rounded-md border border-red-600 bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                    >
                      {t('billing.yesCancel')}
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={() => setConfirmingCancel(false)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
                  >
                    {t('billing.noKeep')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingCancel(true)}
                  className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                >
                  {t('billing.cancelPlan')}
                </button>
              )
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => {
          const active = plan.id === currentPlan;
          return (
            <div
              key={plan.id}
              className={
                'rounded-lg border p-5 ' +
                (plan.highlight
                  ? 'border-gray-900 bg-gray-50 shadow-sm'
                  : 'border-gray-200')
              }
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{t(`plan.${plan.id}`)}</h3>
                {active ? (
                  <span className="rounded-full bg-gray-900 px-2 py-0.5 text-xs text-white">
                    {t('billing.current')}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-2xl font-semibold">
                {plan.priceMonthlyCents
                  ? `$${(plan.priceMonthlyCents / 100).toFixed(2)}`
                  : '$0'}
                <span className="text-sm font-normal text-gray-500">{t('billing.perMonth')}</span>
              </p>
              <ul className="mt-3 space-y-1 text-sm text-gray-600">
                {plan.features.map((feature) => (
                  <li key={feature}>— {feature}</li>
                ))}
              </ul>
              {!active ? (
                <form action={createCheckoutAction.bind(null, plan.id)}>
                  <button
                    type="submit"
                    className={
                      'mt-4 w-full rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 ' +
                      (plan.highlight
                        ? 'bg-gray-900 text-white hover:bg-gray-700'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50')
                    }
                  >
                    {t('billing.upgradeTo', { plan: t(`plan.${plan.id}`) })}
                  </button>
                </form>
              ) : null}
            </div>
          );
        })}
      </div>

      {mode === 'mock' ? (
        <p className="text-xs text-gray-500">{t('billing.simulatedNote')}</p>
      ) : null}
    </div>
  );
}
