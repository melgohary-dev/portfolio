import { useState } from "react";
import { Printer, Usb, Power, Loader2, CheckCircle2 } from "lucide-react";
import { printer, MemoryReceiptPrinter, WebSerialReceiptPrinter } from "@offlinepos/core/browser";
import { usePrinterStore } from "../store/printer";
import { useI18n } from "../i18n";
import type { MessageKey } from "../i18n/messages";
import { cn } from "../lib/utils";

const serialAvailable = typeof navigator !== "undefined" && "serial" in navigator;

/**
 * Desktop sidebar card (lg+): shows the receipt printer's state, connects a
 * real USB thermal printer when Web Serial is available (falls back to the
 * demo printer otherwise), and offers auto-print + test print. Mirrors the
 * NetworkCard layout so the two status cards read as a pair.
 */
export function PrinterCard({ collapsed = false }: { collapsed?: boolean }) {
  const { t } = useI18n();
  const state = usePrinterStore((s) => s.state);
  const error = usePrinterStore((s) => s.error);
  const count = usePrinterStore((s) => s.count);
  const autoPrint = usePrinterStore((s) => s.autoPrint);
  const lastPrintError = usePrinterStore((s) => s.lastPrintError);
  const [busy, setBusy] = useState(false);
  const isDemo = printer.printer instanceof MemoryReceiptPrinter;

  const connect = async () => {
    setBusy(true);
    try {
      if (serialAvailable && printer.printer instanceof MemoryReceiptPrinter) {
        printer.setPrinter(new WebSerialReceiptPrinter());
      }
      const result = await printer.connect();
      // No device / cancelled port picker → fall back to the demo printer so
      // the auto-print + test-print flow stays demonstrable in any browser.
      if (!result.ok) {
        printer.setPrinter(new MemoryReceiptPrinter());
        await printer.connect();
      }
    } catch {
      /* connect() already surfaces failures through printer:state */
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      if (!isDemo) printer.setPrinter(new MemoryReceiptPrinter());
      await printer.disconnect();
    } finally {
      setBusy(false);
    }
  };

  const toggleAutoPrint = () => {
    const next = !autoPrint;
    printer.setAutoPrint(next);
    usePrinterStore.getState().setAutoPrint(next);
  };

  const testPrint = async () => {
    if (state !== "ready") await connect();
    void printer.printTest();
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={state === "ready" ? disconnect : connect}
        title={statusTitle(state, t)}
        data-tip={statusTitle(state, t)}
        aria-label={t("printerCardTitle")}
        className={cn(
          "tip relative flex w-full cursor-pointer items-center justify-center rounded-xl p-2.5 ring-1 transition-colors active:scale-[0.99]",
          state === "ready"
            ? "bg-sky-50 ring-sky-200 hover:bg-sky-100 dark:bg-sky-950/40 dark:ring-sky-900 dark:hover:bg-sky-950/60"
            : state === "error"
              ? "bg-red-50 ring-red-200 hover:bg-red-100 dark:bg-red-950/40 dark:ring-red-900"
              : "bg-elevated ring-line hover:bg-sunken",
        )}
      >
        <Printer
          className={cn(
            "h-4 w-4 shrink-0",
            state === "ready"
              ? "text-sky-600 dark:text-sky-400"
              : state === "error"
                ? "text-red-600 dark:text-red-400"
                : "text-faint-strong",
          )}
        />
        {busy && <Loader2 className="absolute h-3 w-3 animate-spin text-faint-strong" />}
        {isDemo && count > 0 && (
          <span className="tabular absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-500 px-1 text-[9px] font-bold text-white">
            {count}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl px-3 py-2.5 ring-1 transition-colors",
        state === "ready"
          ? "bg-sky-50 ring-sky-200 dark:bg-sky-950/40 dark:ring-sky-900"
          : state === "error"
            ? "bg-red-50 ring-red-200 dark:bg-red-950/40 dark:ring-red-900"
            : "bg-elevated ring-line",
      )}
    >
      <div className="flex items-center gap-2">
        <Printer
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            state === "ready"
              ? "text-sky-600 dark:text-sky-400"
              : state === "error"
                ? "text-red-600 dark:text-red-400"
                : "text-faint-strong",
          )}
        />
        <p className="min-w-0 flex-1 truncate text-xs font-bold text-primary">
          {printer.printer.name}
          {window.offlinepos?.isElectron && (
            <span className="ms-1.5 inline-flex items-center rounded-full bg-slate-200 px-1.5 py-px align-middle text-[9px] font-bold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {t("desktopApp")}
            </span>
          )}
        </p>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
            state === "ready"
              ? "bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300"
              : state === "connecting"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300"
                : state === "error"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300"
                  : "bg-sunken text-faint-strong",
          )}
        >
          {state === "connecting" && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
          {state === "ready" && <CheckCircle2 className="h-2.5 w-2.5" />}
          {stateLabel(state, t)}
        </span>
      </div>

      {isDemo && (
        <p className="mt-1 text-[11px] text-faint-strong">
          {t("printerReceipts", { n: count })}
        </p>
      )}
      <p className="mt-0.5 truncate text-[11px] text-faint-strong">
        {serialAvailable ? t("printerUsbHint") : t("printerNoUsbHint")}
      </p>

      {error && state === "error" && (
        <p className="mt-1 truncate text-[11px] font-medium text-red-700 dark:text-red-400" title={error}>
          {error}
        </p>
      )}
      {lastPrintError && state !== "error" && (
        <p className="mt-1 truncate text-[11px] font-medium text-red-700 dark:text-red-400" title={lastPrintError}>
          {lastPrintError}
        </p>
      )}

      <div className="mt-2 flex items-center gap-2">
        {state === "ready" ? (
          <button
            type="button"
            onClick={disconnect}
            disabled={busy}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-sky-600 px-2.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
          >
            <Power className="h-3 w-3" />
            {t("printerDisconnect")}
          </button>
        ) : (
          <button
            type="button"
            onClick={connect}
            disabled={busy}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-sky-600 px-2.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
          >
            <Usb className="h-3 w-3" />
            {t("printerConnect")}
          </button>
        )}
        <button
          type="button"
          onClick={testPrint}
          disabled={busy}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-sky-300 px-2.5 py-1.5 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100 disabled:opacity-50 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-950/60"
        >
          <Printer className="h-3 w-3" />
          {t("printerTestPrint")}
        </button>
      </div>

      <label className="mt-2 flex cursor-pointer items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-secondary">{t("printerAutoPrint")}</span>
        <button
          type="button"
          role="switch"
          aria-checked={autoPrint}
          onClick={toggleAutoPrint}
          className={cn(
            "relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors",
            autoPrint ? "bg-sky-500" : "bg-line-strong",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
              autoPrint ? "start-[calc(100%-1.125rem)]" : "start-0.5",
            )}
          />
        </button>
      </label>
    </div>
  );
}

function stateLabel(state: string, t: (key: MessageKey) => string): string {
  if (state === "ready") return t("printerReady");
  if (state === "connecting") return t("printerConnecting");
  if (state === "error") return t("printerError");
  return t("printerDisconnected");
}

function statusTitle(state: string, t: (key: MessageKey) => string): string {
  return `${t("printerCardTitle")} · ${stateLabel(state, t)}`;
}
