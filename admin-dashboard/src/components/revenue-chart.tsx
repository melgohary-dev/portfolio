"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { RevenuePoint } from "@/lib/data";
import { useSettings } from "@/components/settings-provider";
import { formatNumber } from "@/lib/utils";
import { useMounted } from "@/lib/use-mounted";

export function RevenueChart({
  data,
  ariaLabel,
}: {
  data: RevenuePoint[];
  ariaLabel?: string;
}) {
  const { t, isDark } = useSettings();
  const mounted = useMounted();

  if (!mounted) {
    return <div className="h-72 w-full" />;
  }

  return (
    <div className="h-72 w-full" dir="ltr" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? "#1e293b" : "#e2e8f0"}
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: isDark ? "#94a3b8" : "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 12, fill: isDark ? "#94a3b8" : "#64748b" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `SAR ${formatNumber(v / 1000)}k`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12, fill: isDark ? "#94a3b8" : "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: isDark ? "#1e293b" : "#f1f5f9", opacity: 0.5 }}
            contentStyle={{
              borderRadius: 12,
              border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
              background: isDark ? "#0f172a" : "#ffffff",
              color: isDark ? "#f1f5f9" : "#0f172a",
              boxShadow: "0 4px 12px rgba(15, 23, 42, 0.18)",
              fontSize: 13,
            }}
            labelStyle={{ color: isDark ? "#cbd5e1" : "#64748b" }}
          />
          <Bar
            yAxisId="left"
            dataKey="revenue"
            name={t("dashboard.revenue")}
            fill={isDark ? "#3b82f6" : "#1074b8"}
            radius={[6, 6, 0, 0]}
            barSize={28}
          />
          <Line
            yAxisId="right"
            dataKey="orders"
            name={t("dashboard.orders")}
            stroke={isDark ? "#818cf8" : "#1140b8"}
            strokeWidth={2.5}
            dot={{ r: 3, fill: isDark ? "#818cf8" : "#1140b8" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
