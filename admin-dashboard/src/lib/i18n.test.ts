import { describe, it, expect } from "vitest";
import { resolvePath, tStatus, tPayment, tRole, messages, locales } from "./i18n";

describe("resolvePath", () => {
  it("resolves a top-level key", () => {
    expect(resolvePath(messages.en, "app.name")).toBe("Admin Console");
  });

  it("resolves a nested key", () => {
    expect(resolvePath(messages.en, "dashboard.totalRevenue")).toBe("Total Revenue");
  });

  it("returns undefined for missing key", () => {
    expect(resolvePath(messages.en, "nonexistent.key")).toBeUndefined();
  });

  it("returns undefined for partial path", () => {
    expect(resolvePath(messages.en, "app")).toBeUndefined();
  });

  it("returns undefined for non-string leaf", () => {
    const obj = { a: { b: 42 } };
    expect(resolvePath(obj, "a.b")).toBeUndefined();
  });

  it("works with Arabic translations", () => {
    expect(resolvePath(messages.ar, "app.name")).toBe("لوحة التحكم");
    expect(resolvePath(messages.ar, "dashboard.title")).toBe("لوحة التحكم");
    expect(resolvePath(messages.ar, "grid.clearSearch")).toBe("مسح البحث");
  });

  it("resolves deep nested keys", () => {
    expect(resolvePath(messages.en, "grid.search")).toBe("Search orders…");
    expect(resolvePath(messages.en, "grid.clearSearch")).toBe("Clear search");
    expect(resolvePath(messages.en, "grid.noResults")).toBe("No orders match your filters.");
  });

  it("returns undefined for empty path", () => {
    expect(resolvePath(messages.en, "")).toBeUndefined();
  });
});

describe("tStatus", () => {
  it("maps 'paid' to 'status.paid'", () => {
    expect(tStatus("paid")).toBe("status.paid");
  });

  it("maps 'pending' to 'status.pending'", () => {
    expect(tStatus("pending")).toBe("status.pending");
  });

  it("maps 'refunded' to 'status.refunded'", () => {
    expect(tStatus("refunded")).toBe("status.refunded");
  });

  it("maps 'active' to 'status.active'", () => {
    expect(tStatus("active")).toBe("status.active");
  });

  it("maps 'suspended' to 'status.suspended'", () => {
    expect(tStatus("suspended")).toBe("status.suspended");
  });

  it("maps 'invited' to 'status.invited'", () => {
    expect(tStatus("invited")).toBe("status.invited");
  });
});

describe("tPayment", () => {
  it("maps 'card' to 'payment.card'", () => {
    expect(tPayment("card")).toBe("payment.card");
  });

  it("maps 'wallet' to 'payment.wallet'", () => {
    expect(tPayment("wallet")).toBe("payment.wallet");
  });

  it("maps 'cash' to 'payment.cash'", () => {
    expect(tPayment("cash")).toBe("payment.cash");
  });
});

describe("tRole", () => {
  it("maps 'Admin' to 'role.admin'", () => {
    expect(tRole("Admin")).toBe("role.admin");
  });

  it("maps 'Cashier' to 'role.cashier'", () => {
    expect(tRole("Cashier")).toBe("role.cashier");
  });

  it("maps 'Manager' to 'role.manager'", () => {
    expect(tRole("Manager")).toBe("role.manager");
  });
});

describe("messages", () => {
  it("has both en and ar locales", () => {
    expect(locales).toEqual(["en", "ar"]);
    expect(messages).toHaveProperty("en");
    expect(messages).toHaveProperty("ar");
  });

  it("en and ar have matching key structures", () => {
    function getKeys(obj: Record<string, unknown>, prefix = ""): string[] {
      return Object.entries(obj).flatMap(([k, v]) => {
        const path = prefix ? `${prefix}.${k}` : k;
        return typeof v === "object" && v !== null
          ? getKeys(v as Record<string, unknown>, path)
          : [path];
      });
    }
    const enKeys = getKeys(messages.en).sort();
    const arKeys = getKeys(messages.ar).sort();
    expect(enKeys).toEqual(arKeys);
  });
});
