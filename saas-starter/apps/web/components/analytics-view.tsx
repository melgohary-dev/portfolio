'use client';

import { useEffect, useRef, useState } from 'react';
import type { StatsResponse } from '@saas/shared';
import { useI18n } from '@/components/i18n-provider';
import { formatMoney, formatNumber } from '@/lib/format';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500',
  paid: 'bg-green-500',
  refunded: 'bg-gray-400',
  failed: 'bg-red-500',
};

export function AnalyticsView() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t, locale } = useI18n();
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const res = await fetch('/api/stats', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error('Failed to load stats');
        }
        const data = (await res.json()) as StatsResponse;
        if (!cancelled) {
          setStats(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t('analytics.failed'));
        }
      } finally {
        inFlight.current = false;
      }
    }
    void load();

    // Pause polling when the tab is hidden to avoid overlapping fetches.
    let interval: number;
    function startPolling() {
      interval = window.setInterval(load, 10000);
    }
    function onVisibility() {
      if (document.hidden) {
        window.clearInterval(interval);
      } else {
        startPolling();
      }
    }
    startPolling();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }
  if (!stats) {
    return <p className="text-sm text-gray-600">{t('analytics.loading')}</p>;
  }

  const maxDay = Math.max(1, ...stats.last7Days.map((d) => d.count));
  const statusTotal = stats.statusBreakdown.reduce((sum, s) => sum + s.count, 0);
  const paidRate =
    statusTotal > 0
      ? (stats.statusBreakdown.find((s) => s.status === 'paid')?.count ?? 0) / statusTotal
      : 0;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi label={t('analytics.totalOrders')} value={formatNumber(stats.totalOrders, locale)} />
        <Kpi label={t('analytics.revenue')} value={formatMoney(stats.revenueCents, locale)} />
        <Kpi label={t('analytics.avgOrderValue')} value={formatMoney(stats.avgOrderValueCents, locale)} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-700">{t('analytics.ordersByStatus')}</h2>
          <ul className="mt-4 space-y-3">
            {stats.statusBreakdown.map((s) => {
              const share = statusTotal > 0 ? (s.count / statusTotal) * 100 : 0;
              return (
                <li key={s.status}>
                  <div className="flex justify-between text-sm">
                    <span className="capitalize text-gray-700">{t(`status.${s.status}`)}</span>
                    <span className="font-medium">
                      {formatNumber(s.count, locale)} · {share.toFixed(0)}%
                    </span>
                  </div>
                  <div
                    className="mt-1 h-2 rounded-full bg-gray-100"
                    role="meter"
                    aria-label={`${t(`status.${s.status}`)}: ${formatNumber(s.count, locale)}`}
                    aria-valuemin={0}
                    aria-valuemax={statusTotal}
                    aria-valuenow={s.count}
                  >
                    <div
                      className={`h-2 rounded-full ${statusColors[s.status] ?? 'bg-gray-400'}`}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold text-gray-700">{t('analytics.last7Days')}</h2>
          <div
            className="mt-3 flex h-40 items-end gap-2"
            role="img"
            aria-label={t('analytics.last7Days')}
          >
            {stats.last7Days.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center justify-end gap-1">
                <span className="text-xs font-medium text-gray-600">{d.count}</span>
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

      <section className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">{t('analytics.successRate')}</h2>
          <span className="text-lg font-semibold text-green-700">
            {(paidRate * 100).toFixed(1)}%
          </span>
        </div>
        <div className="mt-2 h-3 rounded-full bg-gray-100">
          <div
            className="h-3 rounded-full bg-green-500 transition-all"
            style={{ width: `${paidRate * 100}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">{t('analytics.successRateHint')}</p>
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
