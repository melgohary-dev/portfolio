import { describe, it, expect } from "vitest";
import {
  matches,
  isAllowedStatus,
  isAllowedRegion,
  coerceColumnState,
  sanitizeSorting,
  parseSavedViews,
  parseLayoutPrefs,
  ALL,
  COLUMN_IDS,
  LAYOUT_VERSION,
} from "../components/grid-utils";
import type { OrderRow } from "@/lib/orders";

function makeRow(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    id: "ORD-000001",
    idLower: "ord-000001",
    customer: "John Doe",
    customerLower: "john doe",
    region: "Riyadh",
    regionLower: "riyadh",
    payment: "card",
    status: "paid",
    total: 100,
    createdAt: "2024-01-15T10:30:00.000Z",
    ...overrides,
  };
}

describe("matches", () => {
  it("matches by customer name (case-insensitive)", () => {
    expect(matches(makeRow(), "john")).toBe(true);
    expect(matches(makeRow(), "JOHN")).toBe(true);
    expect(matches(makeRow(), "jane")).toBe(false);
  });

  it("matches by order id", () => {
    expect(matches(makeRow({ id: "ORD-000123", idLower: "ord-000123" }), "000123")).toBe(true);
  });

  it("matches by region", () => {
    expect(matches(makeRow(), "riyadh")).toBe(true);
    expect(matches(makeRow(), "jeddah")).toBe(false);
  });

  it("returns false for empty query", () => {
    expect(matches(makeRow(), "")).toBe(false);
    expect(matches(makeRow(), "   ")).toBe(false);
  });
});

describe("isAllowedStatus", () => {
  it("accepts valid statuses", () => {
    expect(isAllowedStatus("paid")).toBe(true);
    expect(isAllowedStatus("pending")).toBe(true);
    expect(isAllowedStatus("refunded")).toBe(true);
  });

  it("rejects invalid statuses", () => {
    expect(isAllowedStatus("shipped")).toBe(false);
    expect(isAllowedStatus("")).toBe(false);
    expect(isAllowedStatus(null)).toBe(false);
  });
});

describe("isAllowedRegion", () => {
  it("accepts valid regions", () => {
    expect(isAllowedRegion("Riyadh")).toBe(true);
    expect(isAllowedRegion("Jeddah")).toBe(true);
  });

  it("rejects invalid regions", () => {
    expect(isAllowedRegion("Dubai")).toBe(false);
    expect(isAllowedRegion("")).toBe(false);
  });
});

describe("coerceColumnState", () => {
  it("extracts boolean and number values", () => {
    const result = coerceColumnState<boolean | number>(
      { id: true, customer: false, total: 42 },
      [...COLUMN_IDS],
    );
    expect(result.id).toBe(true);
    expect(result.customer).toBe(false);
    expect(result.total).toBe(42);
  });

  it("returns empty for non-object input", () => {
    expect(coerceColumnState(null, [...COLUMN_IDS])).toEqual({});
    expect(coerceColumnState("string", [...COLUMN_IDS])).toEqual({});
  });
});

describe("sanitizeSorting", () => {
  it("filters to valid column IDs only", () => {
    const result = sanitizeSorting([
      { id: "total", desc: true },
      { id: "invalid", desc: false },
    ]);
    expect(result).toEqual([{ id: "total", desc: true }]);
  });

  it("returns empty for non-array", () => {
    expect(sanitizeSorting(null)).toEqual([]);
    expect(sanitizeSorting("bad")).toEqual([]);
  });
});

describe("parseSavedViews", () => {
  it("parses valid views", () => {
    const views = parseSavedViews(
      JSON.stringify([{ name: "Test", search: "", status: ALL, region: ALL }]),
    );
    expect(views).toHaveLength(1);
    expect(views[0].name).toBe("Test");
  });

  it("filters invalid entries", () => {
    const views = parseSavedViews(
      JSON.stringify([{ name: "Good" }, { missing: "fields" }, 42]),
    );
    expect(views).toHaveLength(0);
  });

  it("returns empty for null input", () => {
    expect(parseSavedViews(null)).toEqual([]);
  });
});

describe("parseLayoutPrefs", () => {
  it("parses valid layout", () => {
    const prefs = parseLayoutPrefs(
      JSON.stringify({ columnVisibility: { id: true }, columnSizing: { total: 120 } }),
    );
    expect(prefs).not.toBeNull();
    expect(prefs?.columnVisibility.id).toBe(true);
    expect(prefs?.version).toBe(LAYOUT_VERSION);
  });

  it("returns null for invalid input", () => {
    expect(parseLayoutPrefs(null)).toBeNull();
    expect(parseLayoutPrefs("bad json")).toBeNull();
  });
});
