import type { PrinterResult, PrinterState, ReceiptPrinter } from "../printer";

interface SerialPortLike {
  open: (options: { baudRate: number }) => Promise<void>;
  writer?: { write: (data: Uint8Array) => Promise<void>; releaseLock: () => void };
  close: () => Promise<void>;
}

/**
 * Real hardware path: a USB thermal printer exposed as a serial port. Uses the
 * Web Serial API (Chromium). Browser-only (references `navigator.serial`), so
 * it lives in `@offlinepos/core/browser` — the Electron shell re-uses the same
 * `ReceiptPrinter` contract, and mobile apps plug in a Bluetooth/TCP impl.
 * Its tests assert the contract, not the OS calls.
 */
export class WebSerialReceiptPrinter implements ReceiptPrinter {
  readonly name = "USB thermal printer";
  state: PrinterState = "disconnected";
  onStateChange?: (state: PrinterState, error?: string) => void;
  private port: SerialPortLike | null = null;

  constructor(private readonly baudRate = 9600) {}

  async connect(): Promise<PrinterResult> {
    const serial = navigatorSerial();
    if (!serial) {
      return this.fail("Web Serial not supported — use the demo printer in this browser");
    }
    try {
      this.setState("connecting");
      const port = await serial.requestPort();
      await port.open({ baudRate: this.baudRate });
      this.port = port;
      this.setState("ready");
      return { ok: true };
    } catch (err) {
      return this.fail(err instanceof Error ? err.message : "Failed to open serial port");
    }
  }

  async print(receipt: string): Promise<PrinterResult> {
    if (this.state !== "ready" || !this.port) {
      return this.fail("Printer not connected");
    }
    try {
      if (!this.port.writer) {
        const port = this.port as unknown as { getWriter: () => { write: (d: Uint8Array) => Promise<void>; releaseLock: () => void } };
        this.port.writer = port.getWriter();
      }
      const encoder = new TextEncoder();
      await this.port.writer.write(encoder.encode(receipt));
      return { ok: true };
    } catch (err) {
      return this.fail(err instanceof Error ? err.message : "Write to printer failed");
    }
  }

  async disconnect(): Promise<void> {
    this.port?.writer?.releaseLock();
    await this.port?.close();
    this.port = null;
    this.setState("disconnected");
  }

  private fail(error: string): PrinterResult {
    this.setState("error", error);
    return { ok: false, error };
  }

  private setState(state: PrinterState, error?: string): void {
    this.state = state;
    this.onStateChange?.(state, error);
  }
}

function navigatorSerial(): { requestPort: () => Promise<SerialPortLike> } | null {
  if (typeof navigator === "undefined") return null;
  const serial = (navigator as { serial?: { requestPort: () => Promise<SerialPortLike> } }).serial;
  return serial ?? null;
}
