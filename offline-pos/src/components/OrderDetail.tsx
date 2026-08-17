import { useEffect, useState } from "react";
import {
  X,
  AlertCircle,
  Pencil,
  Printer,
  RotateCcw,
  Trash2,
  CloudUpload,
} from "lucide-react";
import { db, bus, queue, sync } from "@offlinepos/core/browser";
import type { Order } from "@offlinepos/core/types";
import { formatMoney } from "../lib/utils";
import { useI18n } from "../i18n";
import { useLocalizedName } from "../hooks/useLocalizedName";
import { useDialogFocus } from "../hooks/useDialogFocus";
import { PAYMENT_METHODS } from "../lib/payments";
import { ProductThumb } from "./ProductThumb";
import { PrintCopy } from "./Receipt";
import { TotalsBreakdown } from "./TotalsBreakdown";
import { StatusChip } from "./StatusChip";

/**
 * Read-only order details. Editing is a cart-based flow: "Edit order" parks
 * the current cart, loads the order into the cart for editing against the
 * product list, and the save/commit happens in the cart panel. Failed orders
 * get an inline recovery banner — retry requeues the mutation, discard voids
 * the sale.
 */
export function OrderDetailView({
  order,
  onClose,
  onEdit,
}: {
  order: Order;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { t, locale } = useI18n();
  const [liveOrder, setLiveOrder] = useState<Order>(order);
  const [failedError, setFailedError] = useState<string | undefined>(undefined);

  // M2: the detail modal is bus-driven — re-read the DB and the queue whenever
  // anything might have touched the order (retry, force push, a remote tab)
  // instead of re-parsing both stores on every render. The prop is only the
  // snapshot captured when the row was clicked.
  useEffect(() => {
    const refresh = () => {
      const current = db.findOrder(order.id);
      setLiveOrder(current ?? order);
      setFailedError(
        current?.status === "failed"
          ? queue.load().find((m) => m.id === order.id)?.error
          : undefined,
      );
    };
    refresh();
    const offDb = bus.on("db:changed", (payload) => {
      if (payload.table === "orders") refresh();
    });
    const offSynced = bus.on("order:synced", (p) => {
      if (p.orderId === order.id) refresh();
    });
    return () => {
      offDb();
      offSynced();
    };
  }, [order]);

  // H3: one hook per dialog — Esc (capture-phase), initial focus and the Tab
  // trap all live here; the overlay's onClick only fires on a backdrop click.
  const dialogRef = useDialogFocus<HTMLDivElement>(true, onClose);

  const paymentMethod =
    PAYMENT_METHODS.find((m) => m.id === liveOrder.paymentMethod) ??
    PAYMENT_METHODS[0];

  return (
    <>
      <PrintCopy order={liveOrder} />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="fixed inset-0 z-50 flex animate-pos-fade-in items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label={t("orderDetails")}
        onClick={onClose}
      >
        <div
          className="flex max-h-[90vh] w-full max-w-lg animate-pos-pop flex-col rounded-2xl bg-surface shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-bold text-primary">
                  {liveOrder.handle}
                </h3>
                <StatusChip status={liveOrder.status} />
              </div>
              <p className="text-xs text-faint">
                {new Date(liveOrder.createdAt).toLocaleString(
                  locale === "ar" ? "ar-SA" : "en-US",
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-full p-1 text-faint hover:bg-sunken hover:text-secondary"
              aria-label={t("closeOrderDetails")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {liveOrder.serverId && (
            <p className="border-b border-line bg-emerald-50/50 px-5 py-1.5 text-[11px] text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
              {t("serverRef", { id: liveOrder.serverId })}
            </p>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
            <p className="mb-1.5 mt-1 flex items-baseline justify-between text-xs font-medium text-secondary">
              <span>{t("items", { n: liveOrder.lines.length })}</span>
              <span className="tabular text-[11px] text-faint-strong">
                {formatMoney(liveOrder.subtotal)}
              </span>
            </p>
            <ul className="divide-y divide-line">
              {liveOrder.lines.map((line) => (
                <DetailLine key={line.productId} line={line} />
              ))}
            </ul>

            <div className="mt-4 space-y-2.5 border-t border-line pt-3">
              <div className="flex items-center justify-between rounded-xl bg-elevated px-3 py-2.5">
                <span className="text-xs font-medium text-secondary">
                  {t("paymentMethod")}
                </span>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                  <PaymentMethodIcon method={liveOrder.paymentMethod} />
                  {t(paymentMethod.labelKey)}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-line px-5 py-3 text-sm">
            <TotalsBreakdown order={liveOrder} />
          </div>

          {liveOrder.status === "failed" && (
            <div className="mx-5 mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900 dark:bg-red-950/40">
              <p className="flex items-start gap-1.5 text-xs font-medium text-red-700 dark:text-red-400">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {failedError ? `${t("failedBanner")} ${failedError}` : t("failedBanner")}
                </span>
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => db.retryOrder(liveOrder.id)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-red-700"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t("retry")}
                </button>
                <button
                  type="button"
                  onClick={() => void sync.forcePush(liveOrder.id)}
                  title={t("forcePushHint")}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/60"
                >
                  <CloudUpload className="h-3.5 w-3.5" />
                  {t("forcePush")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    db.discardOrder(liveOrder.id);
                    onClose();
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("discard")}
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2 border-t border-line px-5 py-3">
            <button
              type="button"
              onClick={() => window.print()}
              disabled={liveOrder.lines.length === 0}
              className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-line-strong px-3.5 py-2.5 text-sm font-semibold text-secondary transition-colors hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              {t("print")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 cursor-pointer rounded-xl bg-sunken py-2.5 text-sm font-semibold text-secondary hover:bg-line"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={onEdit}
              className="flex flex-[1.4] cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-brand to-brand-dark py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:from-brand-dark hover:to-brand-dark active:scale-[0.99]"
            >
              <Pencil className="h-4 w-4" />
              {t("editOrderButton")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function DetailLine({ line }: { line: Order["lines"][number] }) {
  const { t } = useI18n();
  const name = useLocalizedName(line.productId, line.name);
  return (
    <li className="flex items-center gap-3 py-2">
      <ProductThumb
        productId={line.productId}
        name={name}
        emoji={line.emoji}
        className="h-11 w-11"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-primary">{name}</p>
        <p className="tabular text-xs text-faint-strong">
          {t("each", { money: formatMoney(line.price) })} ·{" "}
          {t("items", { n: line.quantity })}
        </p>
      </div>
      <span className="tabular w-16 text-end text-sm font-bold text-primary">
        {formatMoney(line.lineTotal)}
      </span>
    </li>
  );
}

function PaymentMethodIcon({ method }: { method: string }) {
  const info = PAYMENT_METHODS.find((m) => m.id === method) ?? PAYMENT_METHODS[0];
  const Icon = info.icon;
  return <Icon className="h-4 w-4 text-brand" />;
}
