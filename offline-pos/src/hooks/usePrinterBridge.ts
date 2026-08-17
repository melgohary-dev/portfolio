import { useEffect } from "react";
import { bus, printer, MemoryReceiptPrinter } from "@offlinepos/core/browser";
import { usePrinterStore } from "../store/printer";

/**
 * Pipes printer domain events into the reactive store so the sidebar card,
 * the mobile top-bar button and the checkout hook all see the same state.
 * Also seeds the persisted auto-print preference on first mount.
 */
export function usePrinterBridge(): void {
  useEffect(() => {
    usePrinterStore.getState().setAutoPrint(printer.autoPrint);

    const offState = bus.on("printer:state", ({ state, error }) => {
      usePrinterStore.getState().setPrinterState(state, error);
    });
    const offPrinted = bus.on("print:completed", ({ ok, error }) => {
      if (printer.printer instanceof MemoryReceiptPrinter) {
        usePrinterStore.getState().setCount(printer.printer.printed.length);
      }
      usePrinterStore.getState().setLastPrintError(ok ? undefined : error);
    });

    return () => {
      offState();
      offPrinted();
    };
  }, []);
}
