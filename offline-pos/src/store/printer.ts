import { create } from "zustand";
import type { PrinterState } from "@offlinepos/core/browser";

interface PrinterUiState {
  state: PrinterState;
  error?: string;
  count: number;
  autoPrint: boolean;
  lastPrintError?: string;
  setPrinterState: (state: PrinterState, error?: string) => void;
  setCount: (count: number) => void;
  setAutoPrint: (autoPrint: boolean) => void;
  setLastPrintError: (error?: string) => void;
}

export const usePrinterStore = create<PrinterUiState>((set) => ({
  state: "disconnected",
  count: 0,
  autoPrint: false,
  setPrinterState: (state, error) => set({ state, error }),
  setCount: (count) => set({ count }),
  setAutoPrint: (autoPrint) => set({ autoPrint }),
  setLastPrintError: (lastPrintError) => set({ lastPrintError }),
}));
