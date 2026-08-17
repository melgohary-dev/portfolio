import { X, Check } from "lucide-react";
import { createPortal } from "react-dom";
import type { Order } from "@offlinepos/core/types";
import { cn, formatMoney } from "../lib/utils";
import { useI18n } from "../i18n";
import { useLocalizedName } from "../hooks/useLocalizedName";
import { useDialogFocus } from "../hooks/useDialogFocus";
import { TotalsBreakdown } from "./TotalsBreakdown";

/**
 * The till-slip body. Shared by the on-screen receipt overlay and the
 * off-screen print copy so both always render the exact same content.
 */
export function ReceiptSlip({ order }: { order: Order }) {
  const { t, locale } = useI18n();
  const date = new Date(order.createdAt).toLocaleString(
    locale === "ar" ? "ar-SA" : "en-US",
  );

  return (
    <>
      {/* Masthead — like a real thermal till slip. */}
      <div className="px-4 py-4 text-center">
        <p className="text-sm font-black tracking-tight text-primary">
          OFFLINE<span className="text-brand">POS</span>
        </p>
        <p className="text-[10px] uppercase tracking-[0.2em] text-faint">
          {t("orderReceipt")}
        </p>
        <div
          className={cn(
            "mx-auto mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
            order.status === "synced"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
              : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
          )}
        >
          {order.status === "synced" ? (
            <Check className="h-3 w-3" />
          ) : (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
          )}
          {order.status === "synced" ? t("syncedToServer") : t("savedLocally")}
        </div>
        <p className="tabular mt-2 text-base font-bold text-primary">{order.handle}</p>
        <p className="tabular text-[11px] text-faint-strong">{date}</p>
      </div>

      <div className="border-t border-dashed border-line px-4 py-3">
        <ul className="space-y-1.5">
          {order.lines.map((line) => (
            <ReceiptLine key={line.productId} line={line} />
          ))}
        </ul>
      </div>

      <div className="border-t border-dashed border-line px-4 py-3 text-sm">
        <TotalsBreakdown order={order} />
      </div>

      <div className="border-t border-dashed border-line px-4 py-3 text-center">
        <p className="text-[11px] text-faint-strong">{t("thankYou")}</p>
      </div>
    </>
  );
}

function ReceiptLine({
  line,
}: {
  line: { productId: string; name: string; quantity: number; lineTotal: number };
}) {
  const name = useLocalizedName(line.productId, line.name);
  return (
    <li className="flex justify-between gap-2 text-sm">
      <span className="text-secondary">
        <span className="tabular">{line.quantity}</span> × {name}
      </span>
      <span className="tabular shrink-0 font-medium text-primary">
        {formatMoney(line.lineTotal)}
      </span>
    </li>
  );
}

/**
 * Off-screen copy of the slip that is the ONLY thing shown when the user hits
 * print (see the @media print rules in index.css). Portaled straight onto
 * <body> so it escapes the app's stacking/overflow context entirely, and
 * mounted only while the receipt (or order detail) is open — the print CSS
 * hides the rest of the app, so a stale copy would print garbage.
 */
export function PrintCopy({ order }: { order: Order }) {
  return createPortal(
    <div className="print-receipt" aria-hidden="true">
      <ReceiptSlip order={order} />
    </div>,
    document.body,
  );
}

export function Receipt({ order, onClose }: { order: Order; onClose: () => void }) {
  const { t } = useI18n();
  // H3: one hook per dialog. Esc (capture-phase), initial focus and the Tab
  // trap live here; the overlay's onClick below only fires on a backdrop click
  // because the inner panel stops propagation.
  const dialogRef = useDialogFocus<HTMLDivElement>(true, onClose);
  return (
    <>
      <PrintCopy order={order} />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="fixed inset-0 z-50 flex animate-pos-fade-in items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label={t("receipt")}
        onClick={onClose}
      >
        <div
          className="w-full max-w-xs animate-pos-pop overflow-hidden rounded-xl bg-surface shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-dashed border-line px-4 py-2.5 print:hidden">
            <h3 className="text-sm font-bold text-primary">{t("receipt")}</h3>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-full p-1 text-faint hover:bg-sunken hover:text-secondary"
              aria-label={t("closeReceipt")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ReceiptSlip order={order} />

          <div className="border-t border-line bg-elevated px-4 py-3 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="w-full cursor-pointer rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 active:scale-[0.99] dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              {t("printReceipt")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
