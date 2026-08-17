import { useCallback, useEffect, useRef, useState } from "react";
import { db, bus, printer } from "@offlinepos/core/browser";
import { useCartStore } from "../store/cart";
import { useI18n } from "../i18n";
import type { Order } from "@offlinepos/core/types";
import type { ThermalReceiptLabels } from "@offlinepos/core/browser";

/**
 * Completes the checkout: persist the order locally (write-first), enqueue
 * its create mutation, and clear the cart. The sync engine picks it up.
 * When auto-print is enabled the receipt also goes to the thermal printer as
 * soon as the order lands.
 *
 * `placeOrder`/`saveEdit` return `true` when the request was ACCEPTED (i.e. a
 * non-empty cart and no submit already in flight) and `false` when it was
 * blocked. The return is used to drive the UI stage transition; the boolean
 * is the synchronous guard, so a double-tap within the same frame only ever
 * fires one submit.
 */
export function useCheckout() {
  const { t } = useI18n();
  const [placing, setPlacing] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  // `placing` is React state and lags a tick, so a double-tap in the same
  // frame would read `placing === false` twice. This ref is the synchronous
  // guard: set before the settle timer is armed, cleared only inside it.
  const submittingRef = useRef(false);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The settle timer is deliberately not awaited (the guard is `submittingRef`,
  // not the timer). But if the panel unmounts inside the 120ms window, clear
  // it so we never set state on an unmounted component.
  useEffect(
    () => () => {
      if (settleTimerRef.current !== null) clearTimeout(settleTimerRef.current);
    },
    [],
  );

  const maybeAutoPrint = useCallback(
    (order: Order) => {
      if (!printer.autoPrint) return;
      const labels: Partial<ThermalReceiptLabels> = {
        order: t("orderReceipt"),
        subtotal: t("subtotal"),
        discount: t("discount"),
        total: t("total"),
        cash: t("payCash"),
        card: t("payCard"),
        wallet: t("payWallet"),
        savedLocally: t("savedLocally"),
        synced: t("syncedToServer"),
        thankYou: t("thankYou"),
      };
      void printer.printOrder(order, labels);
    },
    [t],
  );

  const placeOrder = useCallback((): boolean => {
    const { lines, discount, taxes, paymentMethod } = useCartStore.getState();
    if (lines.length === 0 || submittingRef.current) return false;
    submittingRef.current = true;
    setPlacing(true);

    // Artificial 120ms delay so the button can render "Processing…" before the
    // order lands — it reads better on a till screen. The double-submit guard
    // is `submittingRef`, which is set synchronously above.
    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null;
      submittingRef.current = false;
      setPlacing(false);
      const order = db.createOrder({ lines, discount, taxes, paymentMethod });
      useCartStore.getState().clear();
      setLastOrder(order);
      maybeAutoPrint(order);
      bus.emit("db:changed", { table: "orders" });
    }, 120);
    return true;
  }, [maybeAutoPrint]);

  const dismissReceipt = useCallback(() => setLastOrder(null), []);

  /**
   * Completes an order edit: the working cart holds the edited order, so we
   * update the existing order in place (recomputed totals), commit the edit
   * session (restoring whatever cart was parked before), and show the receipt
   * of the updated order. Totals are recomputed by the data layer — the caller
   * only supplies line quantities, never line totals.
   */
  const saveEdit = useCallback((): boolean => {
    const state = useCartStore.getState();
    const orderId = state.editSession?.orderId;
    if (!orderId || state.lines.length === 0 || submittingRef.current) return false;

    const { lines, discount, taxes, paymentMethod } = state;
    submittingRef.current = true;
    setPlacing(true);

    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null;
      submittingRef.current = false;
      setPlacing(false);
      const order = db.updateOrder(orderId, {
        lines: lines.map((line) => ({
          productId: line.productId,
          name: line.name,
          emoji: line.emoji,
          price: line.price,
          quantity: line.quantity,
        })),
        discount,
        taxes,
        paymentMethod,
      });
      useCartStore.getState().commitEdit();
      if (order) {
        setLastOrder(order);
        maybeAutoPrint(order);
        bus.emit("db:changed", { table: "orders" });
      }
    }, 120);
    return true;
  }, [maybeAutoPrint]);

  return { placing, lastOrder, placeOrder, saveEdit, dismissReceipt };
}
