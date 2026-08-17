import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine, Discount, DiscountType, Order, Tax } from "@offlinepos/core/types";
import { DEFAULT_TAXES, normalizeDiscount, normalizeTaxes, round2 } from "@offlinepos/core";
import { isPaymentMethodId, type PaymentMethodId } from "../lib/payments";

export interface ParkedCart {
  id: string;
  label: string;
  savedAt: number;
  lines: CartLine[];
  discount: Discount;
  taxes: Tax[];
  paymentMethod: PaymentMethodId;
}

/**
 * An in-progress order edit. The order's lines are loaded into the working
 * cart so the cashier edits with the normal product list; the previous cart
 * is parked in memory and restored on cancel (or after a successful save).
 */
export interface EditSession {
  orderId: string;
  handle: string;
  prevLines: CartLine[];
  prevDiscount: Discount;
  prevTaxes: Tax[];
  prevPaymentMethod: PaymentMethodId;
}

interface CartState {
  lines: CartLine[];
  discount: Discount;
  taxes: Tax[];
  paymentMethod: PaymentMethodId;
  parked: ParkedCart[];
  editSession: EditSession | null;
  /** Order id of the last completed edit, cleared once the receipt is dismissed. */
  lastEditedOrderId: string | null;
  setLastEditedOrderId: (orderId: string | null) => void;
  add: (
    productId: string,
    name: string,
    emoji: string,
    price: number,
    image?: string,
  ) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeLine: (productId: string) => void;
  setDiscountType: (type: DiscountType) => void;
  setDiscountValue: (value: number) => void;
  addTax: (tax: Tax) => void;
  updateTax: (id: string, patch: Partial<Tax>) => void;
  removeTax: (id: string) => void;
  setPaymentMethod: (method: PaymentMethodId) => void;
  park: (label: string) => void;
  resume: (parkedId: string) => void;
  discardParked: (parkedId: string) => void;
  startEditOrder: (order: Order) => void;
  cancelEdit: () => void;
  commitEdit: () => void;
  clearCart: () => void;
  clear: () => void;
  /**
   * Re-reads the parked-orders shelf straight from localStorage after another
   * tab parks/resumes a cart. Only touches `parked` — the in-progress cart in
   * this tab is intentionally left alone.
   */
  syncParkedFromStorage: () => void;
}

/**
 * The working cart plus a "parked carts" shelf.
 *
 * Parked carts survive a reload (zustand persist keeps only `parked` — the
 * in-progress cart is intentionally ephemeral, like a real till). Parking lets
 * a cashier hold a customer's order aside, clear the till for the next
 * customer, then resume the exact cart later — all offline.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      discount: { type: "fixed", value: 0 },
      taxes: DEFAULT_TAXES,
      paymentMethod: "cash",
      parked: [],
      editSession: null,
      lastEditedOrderId: null,

      setLastEditedOrderId: (orderId) => set({ lastEditedOrderId: orderId }),

      add: (productId, name, emoji, price, image) =>
        set((state) => {
          const existing = state.lines.find((line) => line.productId === productId);
          if (existing) {
            return {
              lines: state.lines.map((line) =>
                line.productId === productId
                  ? {
                      ...line,
                      quantity: line.quantity + 1,
                      lineTotal: round2(line.price * (line.quantity + 1)),
                    }
                  : line,
              ),
            };
          }
          return {
            lines: [
              ...state.lines,
              {
                productId,
                name,
                emoji,
                image,
                price,
                quantity: 1,
                lineTotal: price,
              },
            ],
          };
        }),

      setQuantity: (productId, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((line) => line.productId !== productId)
              : state.lines.map((line) =>
                  line.productId === productId
                    ? { ...line, quantity, lineTotal: round2(line.price * quantity) }
                    : line,
                ),
        })),

      removeLine: (productId) =>
        set((state) => ({
          lines: state.lines.filter((line) => line.productId !== productId),
        })),

      setDiscountType: (type) =>
        set({ discount: { type, value: 0 } }),
      setDiscountValue: (value) =>
        set((state) => ({
          discount: {
            type: state.discount.type,
            value:
              state.discount.type === "percent"
                ? Math.max(0, Math.min(1, value))
                : Math.max(0, Math.round(value * 100) / 100),
          },
        })),
      addTax: (tax) =>
        set((state) => ({
          taxes: [...state.taxes.filter((t) => t.id !== tax.id), tax],
        })),
      updateTax: (id, patch) =>
        set((state) => ({
          taxes: state.taxes.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
      removeTax: (id) =>
        set((state) => ({
          taxes: state.taxes.filter((t) => t.id !== id && t.kind !== "vat"),
        })),
      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),

      park: (label) =>
        set((state) => {
          if (state.lines.length === 0) return {};
          const parkedCart: ParkedCart = {
            id: `pkd_${crypto.randomUUID()}`,
            label: label.trim() || `Parked · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
            savedAt: Date.now(),
            lines: state.lines,
            discount: state.discount,
            taxes: state.taxes,
            paymentMethod: state.paymentMethod,
          };
          return {
            parked: [...state.parked, parkedCart],
            lines: [],
            discount: { type: "fixed", value: 0 },
            taxes: DEFAULT_TAXES,
            paymentMethod: "cash",
          };
        }),

      resume: (parkedId) =>
        set((state) => {
          const parkedCart = state.parked.find((p) => p.id === parkedId);
          if (!parkedCart) return {};
          return {
            lines: parkedCart.lines,
            discount: parkedCart.discount,
            taxes: parkedCart.taxes,
            paymentMethod: parkedCart.paymentMethod,
            parked: state.parked.filter((p) => p.id !== parkedId),
          };
        }),

      discardParked: (parkedId) =>
        set((state) => ({
          parked: state.parked.filter((p) => p.id !== parkedId),
        })),

      startEditOrder: (order) =>
        set((state) => {
          if (state.editSession) return {};
          return {
            editSession: {
              orderId: order.id,
              handle: order.handle,
              prevLines: state.lines,
              prevDiscount: state.discount,
              prevTaxes: state.taxes,
              prevPaymentMethod: state.paymentMethod,
            },
            lines: order.lines.map((line) => ({
              productId: line.productId,
              name: line.name,
              emoji: line.emoji ?? "",
              price: line.price,
              quantity: line.quantity,
              lineTotal: line.lineTotal,
            })),
            discount: {
              type: order.discountType ?? "fixed",
              value: order.discountValue ?? order.discount,
            },
            taxes: normalizeTaxes(order.taxes, order.taxRate),
            paymentMethod: isPaymentMethodId(order.paymentMethod)
              ? order.paymentMethod
              : "cash",
          };
        }),

      cancelEdit: () =>
        set((state) =>
          state.editSession ? restoreFromEdit(state.editSession) : {},
        ),

      commitEdit: () =>
        set((state) =>
          state.editSession ? restoreFromEdit(state.editSession) : {},
        ),

      clearCart: () =>
        set({ lines: [], discount: { type: "fixed", value: 0 } }),
      clear: () =>
        set({
          lines: [],
          discount: { type: "fixed", value: 0 },
          taxes: DEFAULT_TAXES,
          paymentMethod: "cash",
        }),
      syncParkedFromStorage: () =>
        set((state) => {
          try {
            const raw = localStorage.getItem("offlinepos:cart");
            if (!raw) return {};
            // Raw localStorage bypasses the persist middleware's migrate, so
            // legacy parked carts are normalized here exactly like on load.
            const parsed = JSON.parse(raw) as { state?: { parked?: unknown[] } };
            const parked = Array.isArray(parsed?.state?.parked)
              ? parsed.state.parked.map((item) => normalizeParkedCart(item as RawParkedCart))
              : null;
            if (parked === null) return {};
            // Serialized compare — if nothing actually changed, skip the set so
            // the shelf doesn't re-render (and re-write) on every storage event.
            if (JSON.stringify(parked) === JSON.stringify(state.parked)) return {};
            return { parked };
          } catch {
            return {};
          }
        }),
    }),
    {
      name: "offlinepos:cart",
      partialize: (state) => ({ parked: state.parked }),
      version: 1,
      // Migrate the persisted shelf for carts saved before multi-tax/discount
      // and validated payment methods existed (v0). Idempotent — new rows pass
      // through `normalizeParkedCart` unchanged.
      migrate: (persisted) => {
        const state = (persisted as { state?: { parked?: unknown[] } }).state ?? {};
        if (Array.isArray(state.parked)) {
          state.parked = state.parked.map((item) => normalizeParkedCart(item as RawParkedCart));
        }
        return state as unknown as CartState;
      },
    },
  ),
);

/**
 * The persisted shape of a parked cart, before normalization — `discount` may
 * be a legacy number, `taxes` may be missing (pre multi-tax), and the payment
 * method may be unknown. Everything the store reads is normalized.
 */
interface RawParkedCart {
  id: string;
  label: string;
  savedAt: number;
  lines: CartLine[];
  discount?: Discount | number;
  taxes?: Tax[];
  taxRate?: number;
  paymentMethod?: string;
}

/**
 * Coerce one persisted parked cart into the current shape: a `number` discount
 * becomes a fixed Discount, a missing/empty tax list falls back to the legacy
 * single VAT row, and an unknown payment method defaults to cash.
 */
function normalizeParkedCart(raw: RawParkedCart): ParkedCart {
  return {
    id: raw.id,
    label: raw.label,
    savedAt: raw.savedAt,
    lines: raw.lines,
    discount: normalizeDiscount(raw.discount ?? 0),
    taxes: normalizeTaxes(raw.taxes, raw.taxRate),
    paymentMethod: isPaymentMethodId(raw.paymentMethod) ? raw.paymentMethod : "cash",
  };
}

function restoreFromEdit(session: EditSession) {
  return {
    editSession: null,
    lines: session.prevLines,
    discount: session.prevDiscount,
    taxes: session.prevTaxes,
    paymentMethod: session.prevPaymentMethod,
  };
}
