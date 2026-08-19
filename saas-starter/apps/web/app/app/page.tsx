import type { StatsResponse } from '@saas/shared';
import { apiFetch } from '@/lib/api';
import { getLocale, getT } from '@/lib/server-i18n';
import { formatMoney, formatNumber } from '@/lib/format';
import { Kpi } from '@/components/kpi';

export default async function DashboardPage() {
  const stats = await apiFetch<StatsResponse>('stats');
  const t = await getT();
  const locale = await getLocale();
  const maxDay = Math.max(1, ...stats.last7Days.map((d) => d.count));

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('dashboard.title')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('dashboard.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi label={t('dashboard.totalOrders')} value={formatNumber(stats.totalOrders, locale)} />
        <Kpi label={t('dashboard.revenue')} value={formatMoney(stats.revenueCents, locale)} />
        <Kpi label={t('dashboard.avgOrderValue')} value={formatMoney(stats.avgOrderValueCents, locale)} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-700">{t('dashboard.ordersByStatus')}</h2>
          <ul className="mt-3 space-y-2">
            {stats.statusBreakdown.map((s) => (
              <li key={s.status} className="flex justify-between text-sm">
                <span className="capitalize text-gray-700">{t(`status.${s.status}`)}</span>
                <span className="font-medium">{formatNumber(s.count, locale)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-700">{t('dashboard.last7Days')}</h2>
          <div
            className="mt-3 flex h-32 items-end gap-2"
            role="img"
            aria-label={t('dashboard.last7Days')}
          >
            {stats.last7Days.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-blue-500"
                  style={{
                    height: d.count === 0 ? '0' : `${(d.count / maxDay) * 100}%`,
                  }}
                />
                <span className="text-xs text-gray-500">{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
