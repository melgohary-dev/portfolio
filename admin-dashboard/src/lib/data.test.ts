import { describe, it, expect } from "vitest";
import {
  REVENUE_DATA,
  PAYMENT_METHODS,
  TOP_PRODUCTS,
  USERS,
  ORDERS,
} from "./data";

describe("REVENUE_DATA", () => {
  it("has 12 months", () => {
    expect(REVENUE_DATA).toHaveLength(12);
  });

  it("each entry has month, revenue, orders", () => {
    for (const entry of REVENUE_DATA) {
      expect(typeof entry.month).toBe("string");
      expect(typeof entry.revenue).toBe("number");
      expect(typeof entry.orders).toBe("number");
      expect(entry.revenue).toBeGreaterThan(0);
      expect(entry.orders).toBeGreaterThan(0);
    }
  });

  it("months are in order (Sep through Aug)", () => {
    const months = REVENUE_DATA.map((d) => d.month);
    expect(months[0]).toBe("Sep");
    expect(months[months.length - 1]).toBe("Aug");
  });
});

describe("PAYMENT_METHODS", () => {
  it("has 3 payment methods", () => {
    expect(PAYMENT_METHODS).toHaveLength(3);
  });

  it("each entry has name, value, color", () => {
    for (const pm of PAYMENT_METHODS) {
      expect(typeof pm.name).toBe("string");
      expect(typeof pm.value).toBe("number");
      expect(pm.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("TOP_PRODUCTS", () => {
  it("has 5 products", () => {
    expect(TOP_PRODUCTS).toHaveLength(5);
  });

  it("each product has name, units, revenue, change", () => {
    for (const p of TOP_PRODUCTS) {
      expect(typeof p.name).toBe("string");
      expect(p.units).toBeGreaterThan(0);
      expect(p.revenue).toBeGreaterThan(0);
      expect(typeof p.change).toBe("number");
    }
  });
});

describe("USERS", () => {
  it("has 5 users", () => {
    expect(USERS).toHaveLength(5);
  });

  it("each user has all required fields", () => {
    for (const u of USERS) {
      expect(typeof u.id).toBe("string");
      expect(typeof u.name).toBe("string");
      expect(u.email).toContain("@");
      expect(["Admin", "Manager", "Cashier"]).toContain(u.role);
      expect(["active", "suspended", "invited"]).toContain(u.status);
      expect(typeof u.createdAt).toBe("string");
    }
  });

  it("user ids are unique", () => {
    const ids = USERS.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("ORDERS", () => {
  it("has 5 orders", () => {
    expect(ORDERS).toHaveLength(5);
  });

  it("each order has valid fields", () => {
    for (const o of ORDERS) {
      expect(o.id).toMatch(/^ORD-\d+$/);
      expect(typeof o.customer).toBe("string");
      expect(o.total).toBeGreaterThan(0);
      expect(["paid", "pending", "refunded"]).toContain(o.status);
      expect(["card", "wallet", "cash"]).toContain(o.payment);
      expect(Number.isNaN(new Date(o.createdAt).getTime())).toBe(false);
    }
  });
});
