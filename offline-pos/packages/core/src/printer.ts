import type { StorageProvider } from "./storage";
import type { EventBus } from "./events";
import type { Order } from "./types";
import { renderThermalReceipt, type ThermalReceiptLabels } from "./receipt-text";

export type PrinterState = "disconnected" | "connecting" | "ready" | "error";

export type PrinterResult = { ok: true } | { ok: false; error: string };

/**
 * A thermal receipt printer. `MemoryReceiptPrinter` stands in for a real
 * device (so the demo and tests work without hardware); the Web Serial
 * implementation lives in `@offlinepos/core/browser` (`WebSerialReceiptPrinter`)
 * because it touches `navigator.serial`.
 */
export interface ReceiptPrinter {
  readonly name: string;
  readonly state: PrinterState;
  /** Fired on every state transition, so the UI can react without polling. */
  onStateChange?: (state: PrinterState, error?: string) => void;
  connect(): Promise<PrinterResult>;
  /** Prints the ESC/POS-ready receipt text. */
  print(receipt: string): Promise<PrinterResult>;
  disconnect(): Promise<void>;
}

/**
 * Demo printer: records every receipt instead of printing it. It "connects"
 * instantly so the whole flow (auto-print after checkout, test print, counts)
 * is demonstrable without a physical USB device.
 */
export class MemoryReceiptPrinter implements ReceiptPrinter {
  readonly name = "Demo printer (no USB)";
  state: PrinterState = "disconnected";
  onStateChange?: (state: PrinterState, error?: string) => void;
  /** The ESC/POS text of every printed receipt, in order. */
  printed: string[] = [];

  setState(state: PrinterState, error?: string): void {
    this.state = state;
    this.onStateChange?.(state, error);
  }

  async connect(): Promise<PrinterResult> {
    this.setState("connecting");
    this.setState("ready");
    return { ok: true };
  }

  async print(receipt: string): Promise<PrinterResult> {
    if (this.state !== "ready") {
      const result: PrinterResult = { ok: false, error: "Printer not connected" };
      return result;
    }
    this.printed.push(receipt);
    return { ok: true };
  }

  async disconnect(): Promise<void> {
    this.setState("disconnected");
  }
}

const SETTINGS_KEY = "offlinepos:printer-settings";

export interface PrinterSettings {
  autoPrint: boolean;
}

/**
 * Owns the active printer and the auto-print-after-checkout preference.
 * Emits domain events (`printer:state`, `print:completed`) so screens stay
 * reactive without polling — the same pattern as the sync engine.
 */
export class PrinterManager {
  private active: ReceiptPrinter;
  private autoPrintValue: boolean;
  private bus: EventBus;
  private storage: StorageProvider;

  constructor(
    storage: StorageProvider,
    bus: EventBus,
    printer?: ReceiptPrinter,
  ) {
    this.storage = storage;
    this.bus = bus;
    this.active = printer ?? new MemoryReceiptPrinter();
    this.active.onStateChange = (state, error) =>
      this.bus.emit("printer:state", { state, error });
    this.autoPrintValue = false;
    const saved = storage.get<PrinterSettings>(SETTINGS_KEY);
    if (saved && typeof saved.autoPrint === "boolean") {
      this.autoPrintValue = saved.autoPrint;
    }
  }

  get printer(): ReceiptPrinter {
    return this.active;
  }

  get autoPrint(): boolean {
    return this.autoPrintValue;
  }

  setAutoPrint(value: boolean): void {
    this.autoPrintValue = value;
    this.storage.set<PrinterSettings>(SETTINGS_KEY, { autoPrint: value });
  }

  setPrinter(printer: ReceiptPrinter): void {
    if (printer === this.active) return;
    // Stop the outgoing printer from reporting state *after* it was swapped
    // out — its async disconnect() must not clobber the new printer's events.
    this.active.onStateChange = undefined;
    void this.active.disconnect();
    this.active = printer;
    this.active.onStateChange = (state, error) =>
      this.bus.emit("printer:state", { state, error });
    this.bus.emit("printer:state", { state: this.active.state });
  }

  async connect(): Promise<PrinterResult> {
    return this.active.connect();
  }

  async disconnect(): Promise<void> {
    await this.active.disconnect();
  }

  async printOrder(
    order: Order,
    labels?: Partial<ThermalReceiptLabels>,
  ): Promise<PrinterResult> {
    const text = renderThermalReceipt(order, { labels });
    const result = await this.active.print(text);
    this.bus.emit("print:completed", {
      orderId: order.id,
      ok: result.ok,
      ...(result.ok ? {} : { error: result.error }),
    });
    return result;
  }

  /** Prints a small sample so the cashier can verify the printer before a sale. */
  async printTest(): Promise<PrinterResult> {
    const sample: Order = {
      id: "test",
      handle: "TEST",
      status: "synced",
      lines: [{ productId: "p", name: "Sample line", price: 10, quantity: 1, lineTotal: 10 }],
      subtotal: 10,
      discount: 0,
      discountType: "fixed",
      discountValue: 0,
      taxes: [],
      taxRate: 0,
      tax: 0,
      total: 10,
      paymentMethod: "cash",
      createdAt: Date.now(),
    };
    const text = renderThermalReceipt(sample);
    const result = await this.active.print(text);
    this.bus.emit("print:completed", {
      ok: result.ok,
      ...(result.ok ? {} : { error: result.error }),
    });
    return result;
  }
}
