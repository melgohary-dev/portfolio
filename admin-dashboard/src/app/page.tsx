"use client";

import { useMemo } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ReceiptText,
  RotateCcw,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import {
  ORDERS,
  TOP_PRODUCTS,
  type DashboardStat,
} from "@/lib/data";
import { cn } from "@/lib/utils";
import { useSettings } from "@/components/settings-provider";
import { Sparkline } from "@/components/sparkline";
import { StatusBadge } from "@/components/status-badge";
import { RevenueOverview } from "@/components/revenue-overview";
import { PaymentChart } from "@/components/payment-chart";
import { useOrdersAggregation } from "@/lib/use-orders-aggregation";
import { buildStats } from "@/lib/orders-stats";
import type { Messages, NestedKeyOf } from "@/lib/i18n";

const STAT_ICONS: Record<string, typeof Wallet> = {
  revenue: Wallet,
  orders: ShoppingCart,
  avgOrder: ReceiptText,
  refundRate: RotateCcw,
};

const STAT_LABELS: Record<string, NestedKeyOf<Messages>> = {
  revenue: "dashboard.totalRevenue",
  orders: "dashboard.orders",
  avgOrder: "dashboard.avgOrderValue",
  refundRate: "dashboard.refundRate",
};

function StatCard({ stat }: { stat: DashboardStat }) {
  const { t } = useSettings();
  const Icon = STAT_ICONS[stat.id] ?? Wallet;
  const good = stat.trend === "up" ? stat.favorable : !stat.favorable;
  const value = stat.value;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-700 dark:text-slate-400">
            {t(STAT_LABELS[stat.id] ?? "dashboard.totalRevenue")}
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            good
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
              : "bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p
        className={cn(
          "mt-2 inline-flex items-center gap-1 text-xs font-semibold",
          good
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-red-500 dark:text-red-400",
        )}
      >
        {stat.trend === "up" ? (
          <ArrowUpRight className="h-3.5 w-3.5" />
        ) : (
          <ArrowDownRight className="h-3.5 w-3.5" />
        )}
        {stat.change}%
        <span className="font-normal text-slate-600 dark:text-slate-500">
          {t("dashboard.vsLastMonth")}
        </span>
      </p>
      <div
        className={cn(
          "mt-3",
          good ? "text-emerald-500" : "text-red-400",
        )}
      >
        <Sparkline data={stat.spark} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { t, formatMoney } = useSettings();
  const { aggregation } = useOrdersAggregation();
  const maxProductRevenue = Math.max(...TOP_PRODUCTS.map((p) => p.revenue));

  // KPI cards are derived from the full dataset aggregated on the Web Worker.
  const kpis = useMemo<DashboardStat[]>(() => {
    if (!aggregation) return [];
    return buildStats(aggregation).map((k) => ({
      id: k.id,
      label: k.id,
      value:
        k.display === "money"
          ? formatMoney(k.value)
          : k.display === "percent"
            ? `${k.value.toFixed(1)}%`
            : k.value.toLocaleString(),
      change: k.change,
      trend: k.change >= 0 ? "up" : "down",
      favorable: k.change >= 0,
      spark: k.spark,
    }));
  }, [aggregation, formatMoney]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {t("dashboard.title")}
        </h1>
        <p className="text-sm text-slate-700 dark:text-slate-400">
          {t("dashboard.subtitle")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {aggregation
          ? kpis.map((stat) => <StatCard key={stat.id} stat={stat} />)
          : Array.from({ length: 4 }, (_, i) => <KpiSkeleton key={i} />)}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueOverview />
        </div>
        <PaymentChart />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div className="mb-4">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">
              {t("dashboard.topProducts")}
            </h2>
            <p className="text-xs text-slate-700 dark:text-slate-400">
              {t("dashboard.topProductsSubtitle")}
            </p>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {TOP_PRODUCTS.map((product, index) => (
              <li key={product.name} className="flex items-center gap-3 py-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                    {product.name}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-500">
                    {product.units} {t("dashboard.units")}
                  </p>
                </div>
                <div className="w-24 text-end">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {formatMoney(product.revenue)}
                  </p>
                  <p
                    className={cn(
                      "text-xs font-medium",
                      product.change >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-500 dark:text-red-400",
                    )}
                  >
                    {product.change >= 0 ? "+" : ""}
                    {product.change}%
                  </p>
                </div>
                <div className="h-1.5 w-10 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{
                      width: `${(product.revenue / maxProductRevenue) * 100}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 xl:col-span-2">
          <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">
              {t("dashboard.recentOrders")}
            </h2>
            <p className="text-xs text-slate-700 dark:text-slate-400">
              {t("dashboard.recentOrdersSubtitle")}
            </p>
          </div>
          <table className="w-full text-start text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">{t("dashboard.order")}</th>
                <th className="px-5 py-3 font-medium">{t("dashboard.customer")}</th>
                <th className="px-5 py-3 font-medium">{t("dashboard.payment")}</th>
                <th className="px-5 py-3 font-medium">{t("dashboard.status")}</th>
                <th className="px-5 py-3 text-end font-medium">
                  {t("dashboard.totalColumn")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {ORDERS.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                >
                  <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">
                    {order.id}
                  </td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                    {order.customer}
                  </td>
                  <td className="px-5 py-3 capitalize text-slate-600 dark:text-slate-400">
                    {t(`payment.${order.payment}` as never)}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge
                      status={order.status}
                      label={t(`status.${order.status}` as never)}
                    />
                  </td>
                  <td className="px-5 py-3 text-end font-semibold text-slate-800 dark:text-slate-100">
                    {formatMoney(order.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="h-3 w-24 rounded bg-slate-100 dark:bg-slate-800" />
      <div className="mt-3 h-7 w-28 rounded bg-slate-100 dark:bg-slate-800" />
      <div className="mt-3 h-8 w-full rounded bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}
