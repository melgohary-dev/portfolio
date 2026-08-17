import { describe, it, expect, vi } from "vitest";
import { MemoryStorageProvider } from "../storage";
import { EventBus } from "../events";
import {
  ESC_POS_CUT,
  THERMAL_WIDTH,
  renderThermalReceipt,
  wrapLine,
} from "../receipt-text";
import {
  MemoryReceiptPrinter,
  PrinterManager,
  type PrinterResult,
  type ReceiptPrinter,
} from "../printer";
import { WebSerialReceiptPrinter } from "../browser/web-serial-printer";
import type { Order } from "../types";

function sampleOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "ord_1",
    handle: "ORD-0001",
    status: "pending",
    lines: [
      { productId: "p1", name: "Café Latte with Oat Milk", emoji: "☕", price: 15, quantity: 2, lineTotal: 30 },
      { productId: "p2", name: "Croissant", emoji: "🥐", price: 12, quantity: 1, lineTotal: 12 },
    ],
    subtotal: 42,
    discount: 5,
    discountType: "fixed",
    discountValue: 5,
    taxes: [{ id: "vat", name: "VAT", kind: "vat", type: "percent", rate: 0.15, amount: 5.55 }],
    taxRate: 0.15,
    tax: 5.55,
    total: 42.55,
    paymentMethod: "cash",
    createdAt: 1700000000000,
    ...overrides,
  };
}

describe("renderThermalReceipt", () => {
  it("prints the handle, status, totals, cut bytes and feed", () => {
    const text = renderThermalReceipt(sampleOrder());
    expect(text).toContain("ORD-0001");
    expect(text).toContain("SAVED LOCALLY");
    expect(text).toContain("OFFLINEPOS");
    expect(text).toContain("THANK YOU");
    expect(text).toContain(`SAR\u00A042.55`);
    expect(text).toContain(`SAR\u00A042.00`);
    expect(text).toContain("VAT (15%)");
    expect(text.trimEnd().endsWith(ESC_POS_CUT)).toBe(true);
  });

  it("uses the synced status label when the order is synced", () => {
    const text = renderThermalReceipt(sampleOrder({ status: "synced", serverId: "svc_1" }));
    expect(text).toContain("SYNCED TO SERVER");
    expect(text).not.toContain("SAVED LOCALLY");
  });

  it("never exceeds the thermal column width", () => {
    const text = renderThermalReceipt(sampleOrder());
    for (const line of text.split("\n")) {
      // Control bytes are an intentional single "line" — skip and non-ASCII.
      if (line.length === 0) continue;
      expect(line.length).toBeLessThanOrEqual(THERMAL_WIDTH + 1);
    }
  });

  it("wraps long item names", () => {
    const order = sampleOrder({ lines: [{ productId: "p", name: "Very Long Product Name That Definitely Exceeds Thirty Two Characters", price: 1, quantity: 1, lineTotal: 1 }] });
    const text = renderThermalReceipt(order);
    const lines = text.split("\n");
    for (const line of lines) {
      expect(line.length).toBeLessThanOrEqual(THERMAL_WIDTH + 1);
    }
  });

  it("accepts localized labels and a custom locale/currency", () => {
    const text = renderThermalReceipt(
      sampleOrder({ status: "synced" }),
      {
        labels: { total: "الإجمالي", thankYou: "شكراً", synced: "تمت المزامنة" },
        locale: "ar-SA",
        currency: "SAR",
      },
    );
    expect(text).toContain("الإجمالي");
    expect(text).toContain("تمت المزامنة");
    expect(text).toContain("شكراً");
  });

  it("renders discount and each tax line when present", () => {
    const text = renderThermalReceipt(sampleOrder());
    expect(text).toContain("Discount");
    expect(text).toContain(`-SAR\u00A05.00`);
    expect(text).toContain("VAT (15%)");
  });
});

describe("wrapLine", () => {
  it("keeps short text on one line", () => {
    expect(wrapLine("Short", 32)).toEqual(["Short"]);
  });

  it("wraps long text and never exceeds the width", () => {
    const parts = wrapLine("a b c d e f g h i j k l m n o p q r s t u v", 12);
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) {
      expect(part.length).toBeLessThanOrEqual(12);
    }
  });
});

describe("MemoryReceiptPrinter", () => {
  it("rejects a print before connecting", async () => {
    const printer = new MemoryReceiptPrinter();
    const result = await printer.print("hello");
    expect(result).toEqual({ ok: false, error: "Printer not connected" });
  });

  it("connects, records receipts, and disconnects with state callbacks", async () => {
    const printer = new MemoryReceiptPrinter();
    const states: string[] = [];
    printer.onStateChange = (state) => states.push(state);

    expect(await printer.connect()).toEqual({ ok: true });
    expect(printer.state).toBe("ready");
    expect(states).toEqual(["connecting", "ready"]);

    expect(await printer.print("R1")).toEqual({ ok: true });
    expect(await printer.print("R2")).toEqual({ ok: true });
    expect(printer.printed).toEqual(["R1", "R2"]);

    await printer.disconnect();
    expect(printer.state).toBe("disconnected");
  });
});

describe("PrinterManager", () => {
  function setup(printer?: ReceiptPrinter) {
    const storage = new MemoryStorageProvider();
    const bus = new EventBus();
    const manager = new PrinterManager(storage, bus, printer);
    return { storage, bus, manager };
  }

  it("defaults to the demo printer with auto-print off", () => {
    const { manager } = setup();
    expect(manager.printer).toBeInstanceOf(MemoryReceiptPrinter);
    expect(manager.autoPrint).toBe(false);
  });

  it("persists the auto-print preference across instances", () => {
    const { storage, manager } = setup();
    manager.setAutoPrint(true);
    expect(manager.autoPrint).toBe(true);
    expect(storage.get<{ autoPrint: boolean }>("offlinepos:printer-settings")).toEqual({
      autoPrint: true,
    });
    const reloaded = new PrinterManager(storage, new EventBus());
    expect(reloaded.autoPrint).toBe(true);
  });

  it("printOrder renders through the active printer and emits print:completed", async () => {
    const { bus, manager } = setup();
    const listener = vi.fn();
    bus.on("print:completed", listener);
    await manager.connect();

    const result = await manager.printOrder(sampleOrder());

    expect(result).toEqual({ ok: true });
    const printed = (manager.printer as MemoryReceiptPrinter).printed[0];
    expect(printed).toContain("ORD-0001");
    expect(listener).toHaveBeenCalledWith({ orderId: "ord_1", ok: true });
  });

  it("printOrder surfaces a failing printer through print:completed", async () => {
    const failing: ReceiptPrinter = {
      name: "Broken",
      state: "error",
      async connect() {
        return { ok: true };
      },
      async print() {
        return { ok: false, error: "Paper jam" } satisfies PrinterResult;
      },
      async disconnect() {},
    };
    const { bus, manager } = setup(failing);
    const listener = vi.fn();
    bus.on("print:completed", listener);

    const result = await manager.printOrder(sampleOrder());

    expect(result).toEqual({ ok: false, error: "Paper jam" });
    expect(listener).toHaveBeenCalledWith({ orderId: "ord_1", ok: false, error: "Paper jam" });
  });

  it("connect emits printer:state transitions", async () => {
    const { bus, manager } = setup();
    const listener = vi.fn();
    bus.on("printer:state", listener);

    expect(await manager.connect()).toEqual({ ok: true });
    expect(listener).toHaveBeenCalledWith({ state: "connecting" });
    expect(listener).toHaveBeenCalledWith({ state: "ready" });
  });

  it("printTest records a sample receipt", async () => {
    const { manager } = setup();
    await manager.connect();
    const result = await manager.printTest();
    expect(result).toEqual({ ok: true });
    expect((manager.printer as MemoryReceiptPrinter).printed).toHaveLength(1);
  });

  it("setPrinter swaps the active printer", async () => {
    const { manager } = setup();
    const next = new MemoryReceiptPrinter();
    manager.setPrinter(next);
    expect(manager.printer).toBe(next);
  });

  it("setPrinter emits the new printer's state and wires its callbacks", async () => {
    const { bus, manager } = setup();
    const listener = vi.fn();
    bus.on("printer:state", listener);

    const next = new MemoryReceiptPrinter();
    manager.setPrinter(next);
    expect(listener).toHaveBeenCalledWith({ state: "disconnected" });

    await next.connect();
    expect(listener).toHaveBeenCalledWith({ state: "connecting" });
    expect(listener).toHaveBeenCalledWith({ state: "ready" });
  });

  it("setPrinter with the same printer is a no-op", () => {
    const { manager } = setup();
    const before = manager.printer;
    manager.setPrinter(before);
    expect(manager.printer).toBe(before);
  });

  it("a slow disconnect on the outgoing printer cannot clobber the new printer's state", async () => {
    const { bus, manager } = setup();
    const states: string[] = [];
    bus.on("printer:state", ({ state }) => states.push(state));

    const slow: ReceiptPrinter = {
      name: "Slow",
      state: "ready",
      async connect() {
        return { ok: true };
      },
      async print() {
        return { ok: true };
      },
      async disconnect() {
        await new Promise((resolve) => setTimeout(resolve, 0));
        this.onStateChange?.("disconnected");
      },
    };
    manager.setPrinter(slow);

    const next = new MemoryReceiptPrinter();
    manager.setPrinter(next);
    await next.connect();
    // Give the outgoing printer's late disconnect a chance to fire.
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(manager.printer).toBe(next);
    expect(manager.printer.state).toBe("ready");
    expect(states.at(-1)).toBe("ready");
  });

  it("disconnect delegates to the active printer", async () => {
    const { manager } = setup();
    await manager.connect();
    expect(manager.printer.state).toBe("ready");
    await manager.disconnect();
    expect(manager.printer.state).toBe("disconnected");
  });
});

describe("WebSerialReceiptPrinter", () => {
  it("fails cleanly when Web Serial is unavailable", async () => {
    const printer = new WebSerialReceiptPrinter();
    const result = await printer.connect();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Web Serial not supported");
    expect(printer.state).toBe("error");
  });
});
