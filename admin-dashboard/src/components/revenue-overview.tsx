"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { REVENUE_DATA, type RevenuePoint } from "@/lib/data";
import { cn, formatNumber } from "@/lib/utils";
import { useSettings } from "@/components/settings-provider";
import { RevenueChart } from "@/components/revenue-chart";

const PERIODS = [
  { key: "3m", label: "dashboard.months3", months: 3 },
  { key: "6m", label: "dashboard.months6", months: 6 },
  { key: "12m", label: "dashboard.months12", months: 12 },
] as const;

function totals(data: RevenuePoint[]) {
  return data.reduce(
    (acc, point) => ({
      revenue: acc.revenue + point.revenue,
      orders: acc.orders + point.orders,
    }),
    { revenue: 0, orders: 0 },
  );
}

function Delta({ value }: { value: number | null }) {
  if (value === null) return null;
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
        // emerald-600/red-500 on their light tinted backgrounds clears WCAG AA;
        // emerald-500/red-400 used before did not.
        up ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300",
      )}
    >
      {up ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export function RevenueOverview() {
  const { t, formatMoney } = useSettings();
  const [months, setMonths] = useState(6);

  const { data, current, previous, range } = useMemo(() => {
    const cur = REVENUE_DATA.slice(-months);
    const prev = REVENUE_DATA.slice(-months * 2, -months);
    return {
      data: cur,
      current: totals(cur),
      previous: prev.length > 0 ? totals(prev) : null,
      range: `${cur[0].month} – ${cur[cur.length - 1].month}`,
    };
  }, [months]);

  const revenueDelta =
    previous === null
      ? null
      : ((current.revenue - previous.revenue) / previous.revenue) * 100;
  const ordersDelta =
    previous === null
      ? null
      : ((current.orders - previous.orders) / previous.orders) * 100;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">
            {t("dashboard.revenueOrders")}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {range}, {t("dashboard.inSar")}
          </p>
        </div>
        <div
          className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
          role="group"
          aria-label={t("dashboard.revenueOrders")}
        >
          {PERIODS.map((period) => (
            <button
              key={period.key}
              type="button"
              onClick={() => setMonths(period.months)}
              aria-pressed={months === period.months}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                months === period.months
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-50"
                  : "text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
              )}
            >
              {t(period.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-6">
        <div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {t("dashboard.revenue")}
          </p>
          <div className="mt-0.5 flex items-center gap-2">
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {formatMoney(current.revenue)}
            </p>
            <Delta value={revenueDelta} />
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {t("dashboard.orders")}
          </p>
          <div className="mt-0.5 flex items-center gap-2">
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {formatNumber(current.orders)}
            </p>
            <Delta value={ordersDelta} />
          </div>
        </div>
      </div>

      <RevenueChart
        data={data}
        ariaLabel={`${t("dashboard.revenueOrders")}, ${range}, ${t("dashboard.inSar")}`}
      />
    </div>
  );
}
