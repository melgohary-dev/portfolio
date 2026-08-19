import { describe, it, expect } from "vitest";
import { buildStats } from "./orders-stats";
import type { Aggregation } from "./orders-worker";

function makeAggregation(overrides: Partial<Aggregation> = {}): Aggregation {
  const days = Array.from({ length: 90 }, (_, i) => ({
    day: `2026-${String(Math.floor(i / 30) + 5).padStart(2, "0")}-${String((i % 30) + 1).padStart(2, "0")}`,
    count: 100 + i,
    revenue: 5000 + i * 100,
  }));

  return {
    totalOrders: 10_000,
    totalRevenue: 500_000,
    avgOrder: 50,
    byStatus: {
      paid: { count: 7800, revenue: 390_000 },
      pending: { count: 1500, revenue: 75_000 },
      refunded: { count: 700, revenue: 35_000 },
    },
    byPayment: {
      card: { count: 4500, revenue: 225_000 },
      wallet: { count: 3000, revenue: 150_000 },
      cash: { count: 2500, revenue: 125_000 },
    },
    byRegion: {},
    byDay: days,
    ...overrides,
  };
}

describe("buildStats", () => {
  it("returns exactly 4 KPI stats", () => {
    const stats = buildStats(makeAggregation());
    expect(stats).toHaveLength(4);
  });

  it("has revenue, orders, avgOrder, refundRate ids", () => {
    const stats = buildStats(makeAggregation());
    const ids = stats.map((s) => s.id);
    expect(ids).toEqual(["revenue", "orders", "avgOrder", "refundRate"]);
  });

  it("revenue stat has display 'money'", () => {
    const stats = buildStats(makeAggregation());
    const revenue = stats.find((s) => s.id === "revenue")!;
    expect(revenue.display).toBe("money");
  });

  it("orders stat has display 'count'", () => {
    const stats = buildStats(makeAggregation());
    const orders = stats.find((s) => s.id === "orders")!;
    expect(orders.display).toBe("count");
  });

  it("refundRate stat has display 'percent' and change 0", () => {
    const stats = buildStats(makeAggregation());
    const refundRate = stats.find((s) => s.id === "refundRate")!;
    expect(refundRate.display).toBe("percent");
    expect(refundRate.change).toBe(0);
  });

  it("refundRate is computed from byStatus.refunded / totalOrders", () => {
    const agg = makeAggregation();
    const stats = buildStats(agg);
    const refundRate = stats.find((s) => s.id === "refundRate")!;
    const expected = (700 / 10_000) * 100;
    expect(refundRate.value).toBeCloseTo(expected, 1);
  });

  it("refundRate is 0 when totalOrders is 0", () => {
    const agg = makeAggregation({ totalOrders: 0 });
    const stats = buildStats(agg);
    const refundRate = stats.find((s) => s.id === "refundRate")!;
    expect(refundRate.value).toBe(0);
  });

  it("every stat has a spark array", () => {
    const stats = buildStats(makeAggregation());
    for (const stat of stats) {
      expect(Array.isArray(stat.spark)).toBe(true);
      expect(stat.spark.length).toBeGreaterThan(0);
    }
  });

  it("spark arrays are approximately 12 buckets (weekly downsampled)", () => {
    const stats = buildStats(makeAggregation());
    for (const stat of stats) {
      expect(stat.spark.length).toBeLessThanOrEqual(13);
      expect(stat.spark.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("handles edge case: fewer than 28 days (prev is partial)", () => {
    const days = Array.from({ length: 14 }, (_, i) => ({
      day: `2026-08-${String(i + 1).padStart(2, "0")}`,
      count: 100,
      revenue: 5000,
    }));
    const agg = makeAggregation({ byDay: days, totalOrders: 1400, totalRevenue: 70_000 });
    const stats = buildStats(agg);
    const revenue = stats.find((s) => s.id === "revenue")!;
    // prev28 is empty (14 < 28) so change = 0
    expect(revenue.change).toBe(0);
  });

  it("handles edge case: no byDay entries", () => {
    const agg = makeAggregation({ byDay: [] });
    const stats = buildStats(agg);
    const revenue = stats.find((s) => s.id === "revenue")!;
    expect(revenue.value).toBe(500_000); // totalRevenue from agg
    expect(revenue.spark).toEqual([]);
  });
});
