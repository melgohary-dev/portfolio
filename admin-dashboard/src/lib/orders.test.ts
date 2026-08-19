import { describe, it, expect } from "vitest";
import { generateOrders, getOrders, ORDERS_COUNT, ORDER_STATUSES, ORDER_REGIONS } from "./orders";

describe("orders", () => {
  it("generates the correct number of orders", () => {
    const orders = generateOrders(100);
    expect(orders).toHaveLength(100);
  });

  it("ORDERS_COUNT is 120_000", () => {
    expect(ORDERS_COUNT).toBe(120_000);
  });

  it("each order has all required fields", () => {
    const orders = generateOrders(50);
    for (const order of orders) {
      expect(order).toHaveProperty("id");
      expect(order).toHaveProperty("customer");
      expect(order).toHaveProperty("total");
      expect(order).toHaveProperty("status");
      expect(order).toHaveProperty("payment");
      expect(order).toHaveProperty("createdAt");
      expect(order).toHaveProperty("region");
      expect(order).toHaveProperty("idLower");
      expect(order).toHaveProperty("customerLower");
      expect(order).toHaveProperty("regionLower");
    }
  });

  it("ids are zero-padded ORD-NNNNNN", () => {
    const orders = generateOrders(200);
    expect(orders[0].id).toBe("ORD-000001");
    expect(orders[99].id).toBe("ORD-000100");
    expect(orders[199].id).toBe("ORD-000200");
  });

  it("lowercase fields match their originals", () => {
    const orders = generateOrders(100);
    for (const order of orders) {
      expect(order.idLower).toBe(order.id.toLowerCase());
      expect(order.customerLower).toBe(order.customer.toLowerCase());
      expect(order.regionLower).toBe(order.region.toLowerCase());
    }
  });

  it("status is one of the valid values", () => {
    const valid = new Set(["paid", "pending", "refunded"]);
    const orders = generateOrders(500);
    for (const order of orders) {
      expect(valid.has(order.status)).toBe(true);
    }
  });

  it("payment is one of the valid values", () => {
    const valid = new Set(["card", "wallet", "cash"]);
    const orders = generateOrders(500);
    for (const order of orders) {
      expect(valid.has(order.payment)).toBe(true);
    }
  });

  it("region is one of the valid regions", () => {
    const valid = new Set(["Riyadh", "Jeddah", "Dammam", "Mecca"]);
    const orders = generateOrders(500);
    for (const order of orders) {
      expect(valid.has(order.region)).toBe(true);
    }
  });

  it("total is between 20 and 800", () => {
    const orders = generateOrders(500);
    for (const order of orders) {
      expect(order.total).toBeGreaterThanOrEqual(20);
      expect(order.total).toBeLessThanOrEqual(800);
    }
  });

  it("generates deterministic results for the same count", () => {
    const a = generateOrders(10);
    const b = generateOrders(10);
    expect(a).toEqual(b);
  });

  it("generates different results for different seeds (different counts)", () => {
    const a = generateOrders(10);
    const b = generateOrders(10);
    // Same seed means same sequence — first 10 are identical
    expect(a.map((o) => o.id)).toEqual(b.map((o) => o.id));
    // But 10 vs 20 should differ in length
    const c = generateOrders(20);
    expect(c.length).toBe(20);
    expect(c.slice(0, 10).map((o) => o.id)).toEqual(a.map((o) => o.id));
  });

  it("getOrders returns memoized reference", () => {
    const a = getOrders();
    const b = getOrders();
    expect(a).toBe(b);
    expect(a).toHaveLength(ORDERS_COUNT);
  });

  it("ORDER_STATUSES and ORDER_REGIONS contain expected values", () => {
    expect(ORDER_STATUSES).toEqual(["paid", "pending", "refunded"]);
    expect(ORDER_REGIONS).toEqual(["Riyadh", "Jeddah", "Dammam", "Mecca"]);
  });

  it("createdAt is a valid ISO date string", () => {
    const orders = generateOrders(20);
    for (const order of orders) {
      expect(new Date(order.createdAt).toISOString()).toBe(order.createdAt);
    }
  });
});
