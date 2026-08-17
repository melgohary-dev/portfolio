"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { PAYMENT_METHODS } from "@/lib/data";
import { useSettings } from "@/components/settings-provider";
import { tPayment } from "@/lib/i18n";
import { formatNumber } from "@/lib/utils";
import { useMounted } from "@/lib/use-mounted";
import type { PaymentMethod } from "@/lib/orders";

export function PaymentChart() {
  const { t, isDark, formatMoney } = useSettings();
  const mounted = useMounted();

  const total = PAYMENT_METHODS.reduce((sum, method) => sum + method.value, 0);
  const methods = PAYMENT_METHODS.map((method) =>
    method.name === "Cash" && isDark
      ? { ...method, color: "#475569" }
      : method,
  );

  return (
    <div className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="mb-2">
        <h2 className="font-semibold">{t("dashboard.paymentMethods")}</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {t("dashboard.paymentSubtitle")}
        </p>
      </div>

      <div
        role="img"
        aria-label={t("dashboard.paymentMethods")}
        className="relative mx-auto h-44 w-full"
        dir="ltr"
      >
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={methods}
                dataKey="value"
                nameKey="name"
                innerRadius={52}
                outerRadius={74}
                paddingAngle={2}
                strokeWidth={0}
              >
                {methods.map((method) => (
                  <Cell key={method.name} fill={method.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) =>
                  typeof value === "number"
                    ? [
                        `${formatMoney(value)} · ${((value / total) * 100).toFixed(0)}%`,
                        t("dashboard.revenue"),
                      ]
                    : value
                }
                contentStyle={{
                  borderRadius: 12,
                  border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                  background: isDark ? "#0f172a" : "#ffffff",
                  color: isDark ? "#f1f5f9" : "#0f172a",
                  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.18)",
                  fontSize: 13,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] text-slate-600 dark:text-slate-400">
            {t("dashboard.total")}
          </span>
          <span className="text-lg font-bold leading-tight">
            {formatMoney(total)}
          </span>
        </div>
      </div>

      <ul className="mt-4 space-y-2.5">
        {methods.map((method) => {
          const share = (method.value / total) * 100;
          // PAINT_METHODS names are capitalized English labels ("Card"); reuse
          // the payment-status translations for the legend.
          const label = t(tPayment(method.name.toLowerCase() as PaymentMethod));
          return (
            <li key={method.name} className="flex items-center gap-3 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: method.color }}
              />
              <span className="flex-1 text-slate-600 dark:text-slate-300">
                {label}
              </span>
              <span className="text-xs tabular-nums text-slate-600 dark:text-slate-400">
                {formatNumber(Math.round(share))}%
              </span>
              <span className="w-20 text-end font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                {formatMoney(method.value)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
