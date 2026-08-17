import type { Discount, Tax } from "./types";

export interface TaxAmount {
  tax: Tax;
  amount: number;
}

export interface Pricing {
  subtotal: number;
  discountAmount: number;
  taxable: number;
  taxAmounts: TaxAmount[];
  tax: number;
  total: number;
}

/** Default tax list: a single VAT line, always a percentage. */
export const DEFAULT_TAXES: Tax[] = [
  { id: "vat", name: "VAT", kind: "vat", type: "percent", rate: 0.15 },
];

/** Round a currency amount to 2 decimal places — the single rounding helper. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * The VAT rate currently applied, or 0 when no VAT tax is present. The schema
 * allows several tax rows; when more than one is a VAT row, the FIRST one wins.
 */
export function vatRate(taxes: Tax[]): number {
  return taxes.find((tax) => tax.kind === "vat")?.rate ?? 0;
}

export function computeDiscountAmount(subtotal: number, discount: Discount): number {
  const value = Math.max(0, discount.value);
  if (discount.type === "percent") return round2(subtotal * Math.min(1, value));
  return round2(Math.min(value, subtotal));
}

export function computeTaxAmount(taxable: number, tax: Tax): number {
  if (tax.type === "percent") {
    return round2(taxable * Math.max(0, Math.min(1, tax.rate ?? 0)));
  }
  return round2(Math.max(0, tax.value ?? 0));
}

/**
 * Single source of truth for totals. Taxes are applied to the discounted
 * subtotal; fixed taxes are flat fees regardless of the base.
 */
export function computePricing(
  lines: { lineTotal: number }[],
  discount: Discount,
  taxes: Tax[],
): Pricing {
  const subtotal = round2(lines.reduce((sum, line) => sum + line.lineTotal, 0));
  const discountAmount = computeDiscountAmount(subtotal, discount);
  const taxable = round2(subtotal - discountAmount);
  const taxAmounts = taxes.map((tax) => ({ tax, amount: computeTaxAmount(taxable, tax) }));
  const tax = round2(taxAmounts.reduce((sum, item) => sum + item.amount, 0));
  const total = round2(taxable + tax);
  return { subtotal, discountAmount, taxable, taxAmounts, tax, total };
}

/** Coerce persisted values (old carts stored a plain number) to a Discount. */
export function normalizeDiscount(value: Discount | number): Discount {
  if (typeof value === "number") {
    return { type: "fixed", value: Math.max(0, value) };
  }
  return {
    type: value.type,
    value: Math.max(0, value.value),
  };
}

/**
 * Coerce a stored tax list, falling back to a single VAT line derived from the
 * legacy single-rate field for carts/orders saved before multiple taxes.
 */
export function normalizeTaxes(taxes?: Tax[], legacyRate = 0): Tax[] {
  if (taxes && taxes.length > 0) return taxes;
  if (legacyRate > 0) {
    return [{ id: "vat", name: "VAT", kind: "vat", type: "percent", rate: legacyRate }];
  }
  return [];
}
