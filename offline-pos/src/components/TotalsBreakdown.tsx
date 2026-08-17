import type { Order, OrderTax } from "@offlinepos/core/types";
import { formatMoney } from "../lib/utils";
import { useI18n } from "../i18n";
import type { MessageKey } from "../i18n/messages";

type TranslateFn = (key: MessageKey, vars?: Record<string, string | number>) => string;

function taxLabel(tax: OrderTax, t: TranslateFn): string {
  if (tax.type === "percent") {
    return t("taxLinePct", { name: tax.name, pct: Math.round((tax.rate ?? 0) * 100) });
  }
  return tax.name;
}

/**
 * Subtotal → discount → taxes → total rows for an order. Shared by the receipt,
 * the order details, and the live cart so every breakdown stays consistent.
 * Legacy orders (single taxRate) render as a single VAT line.
 */
export function TotalsBreakdown({ order }: { order: Order }) {
  const { t } = useI18n();
  const taxes: OrderTax[] =
    order.taxes.length > 0
      ? order.taxes
      : [
          {
            id: "vat",
            name: "VAT",
            kind: "vat",
            type: "percent",
            rate: order.taxRate,
            amount: order.tax,
          },
        ];

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-secondary">
        <span>{t("subtotal")}</span>
        <span className="tabular">{formatMoney(order.subtotal)}</span>
      </div>

      {order.discount > 0 && (
        <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
          <span>
            {order.discountType === "percent"
              ? t("discountLinePct", {
                  pct: Math.round((order.discountValue ?? 0) * 100),
                })
              : t("discountLine")}
          </span>
          <span className="tabular">-{formatMoney(order.discount)}</span>
        </div>
      )}

      {taxes
        .filter((tax) => tax.amount > 0)
        .map((tax) => (
          <div key={tax.id} className="flex justify-between text-secondary">
            <span>{taxLabel(tax, t)}</span>
            <span className="tabular">{formatMoney(tax.amount)}</span>
          </div>
        ))}

      <div className="flex justify-between border-t border-dashed border-line-strong pt-2 text-base font-bold text-primary">
        <span>{t("total")}</span>
        <span className="tabular">{formatMoney(order.total)}</span>
      </div>
    </div>
  );
}
