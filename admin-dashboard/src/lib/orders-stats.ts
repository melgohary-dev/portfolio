import type { Aggregation } from "./orders-worker";

export interface KpiStat {
  id: "revenue" | "orders" | "avgOrder" | "refundRate";
  value: number;
  display: "money" | "count" | "percent";
  /** Trailing 28 days vs the previous 28 days, as a percentage. */
  change: number;
  spark: number[];
}

/**
 * Downsamples a daily series to ~`size` buckets by summing consecutive days.
 * The chunk width is derived from the input length, so short histories (e.g. a
 * sparse filter result) still produce a usable sparkline shape.
 */
function weekly(values: number[], size = 12): number[] {
  const out: number[] = [];
  const chunk = Math.max(1, Math.ceil(values.length / size));
  for (let i = 0; i < values.length; i += chunk) {
    let s = 0;
    for (let j = i; j < i + chunk && j < values.length; j++) s += values[j];
    out.push(s);
  }
  return out;
}

/**
 * Turns the worker aggregation of the full dataset into the four dashboard
 * KPI cards. `byDay` is sorted ascending (see the worker's aggregation), so
 * trailing windows are slices of the end of the array and the last ~28 entries
 * are the most recent 28 days. Sparks are ~12 weekly buckets over the last
 * ~12 weeks.
 */
export function buildStats(a: Aggregation): KpiStat[] {
  const days = a.byDay;
  const last28 = days.slice(-28);
  const prev28 = days.slice(-56, -28);
  const rev = (arr: typeof days) => arr.reduce((s, d) => s + d.revenue, 0);
  const cnt = (arr: typeof days) => arr.reduce((s, d) => s + d.count, 0);
  const pctChange = (prev: number, curr: number) =>
    prev === 0 ? 0 : Math.round(((curr - prev) / prev) * 1000) / 10;

  const revCurr = rev(last28);
  const revPrev = rev(prev28);
  const ordCurr = cnt(last28);
  const ordPrev = cnt(prev28);
  const aovCurr = ordCurr ? revCurr / ordCurr : 0;
  const aovPrev = ordPrev ? revPrev / ordPrev : 0;

  const weekRev = weekly(days.slice(-84).map((d) => d.revenue));
  const weekOrd = weekly(days.slice(-84).map((d) => d.count));
  const weekAov = weekOrd.map((o, i) => (o ? weekRev[i] / o : 0));

  const refundRate = a.totalOrders
    ? ((a.byStatus.refunded?.count ?? 0) / a.totalOrders) * 100
    : 0;

  return [
    {
      id: "revenue",
      value: a.totalRevenue,
      display: "money",
      change: pctChange(revPrev, revCurr),
      spark: weekRev,
    },
    {
      id: "orders",
      value: a.totalOrders,
      display: "count",
      change: pctChange(ordPrev, ordCurr),
      spark: weekOrd,
    },
    {
      id: "avgOrder",
      value: a.avgOrder,
      display: "money",
      change: pctChange(aovPrev, aovCurr),
      spark: weekAov,
    },
    {
      id: "refundRate",
      value: refundRate,
      display: "percent",
      change: 0,
      spark: weekOrd,
    },
  ];
}
