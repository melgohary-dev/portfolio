export interface Product {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  price: number;
  emoji: string;
  image: string;
  inStock: boolean;
}

export interface CartLine {
  productId: string;
  name: string;
  emoji: string;
  image?: string;
  price: number;
  quantity: number;
  lineTotal: number;
}

export interface PaymentMethod {
  id: string;
  label: string;
}

export type OrderStatus = "pending" | "synced" | "failed";

/**
 * A single tax applied to an order. VAT is always a percentage; custom taxes
 * may be either a percentage of the discounted subtotal or a fixed amount.
 */
export type TaxKind = "vat" | "custom";
export type TaxType = "percent" | "fixed";

export interface Tax {
  id: string;
  name: string;
  kind: TaxKind;
  type: TaxType;
  /** Percentage rate (0..1) — set when `type === "percent"`. */
  rate?: number;
  /** Fixed currency amount — set when `type === "fixed"`. */
  value?: number;
}

/** A tax as stored on an order: the config plus the computed amount applied. */
export interface OrderTax extends Tax {
  amount: number;
}

/** Discount applied to the subtotal: a flat amount or a percentage. */
export type DiscountType = "fixed" | "percent";

export interface Discount {
  type: DiscountType;
  /** Fixed: currency amount. Percent: rate (0..1). */
  value: number;
}

export interface OrderLine {
  productId: string;
  name: string;
  emoji?: string;
  price: number;
  quantity: number;
  /** Computed at write-time by the data layer. */
  lineTotal: number;
}

export interface Order {
  id: string;
  handle: string;
  status: OrderStatus;
  lines: OrderLine[];
  subtotal: number;
  /** Computed discount amount applied. */
  discount: number;
  /** How the discount was entered ("fixed" for legacy orders). */
  discountType: DiscountType;
  /** The entered discount value (fixed: amount, percent: rate 0..1). */
  discountValue: number;
  /** Taxes applied (config + computed amounts). Empty for legacy orders. */
  taxes: OrderTax[];
  /** Legacy single-rate fallback (VAT rate when a VAT tax is applied). */
  taxRate: number;
  /** Total tax amount applied. */
  tax: number;
  total: number;
  paymentMethod: string;
  createdAt: number;
  serverId?: string;
}

export interface CreateOrderInput {
  lines: CartLine[];
  discount: Discount;
  taxes: Tax[];
  paymentMethod: string;
}

/** A line as supplied to `updateOrder` — totals are not caller input. */
export interface OrderLineInput {
  productId: string;
  name: string;
  emoji?: string;
  price: number;
  quantity: number;
}

/**
 * Input for `updateOrder`. Line totals are deliberately NOT accepted here: the
 * data layer recomputes each `lineTotal` from `price * quantity` so a stale or
 * hand-edited total can never leak into the record.
 */
export interface UpdateOrderInput {
  lines: OrderLineInput[];
  discount: Discount;
  taxes: Tax[];
  paymentMethod: string;
}
