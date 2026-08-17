import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useLocaleStore } from "../i18n";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// One Intl.NumberFormat per locale+currency, reused across all money renders
// (rows, totals, receipts) instead of re-allocating one per call.
const moneyFormatters = new Map<string, Intl.NumberFormat>();

/**
 * Formats money for the active UI locale: Western "SAR" prefix in English,
 * Arabic currency (ر.س) with Latin digits in Arabic — a POS convention that
 * keeps amounts readable on a physical keypad.
 */
export function formatMoney(value: number, currency = "SAR"): string {
  const locale = useLocaleStore.getState().locale;
  const key = `${locale}:${currency}`;
  let formatter = moneyFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...(locale === "ar" ? { numberingSystem: "latn" } : {}),
    });
    moneyFormatters.set(key, formatter);
  }
  return formatter.format(value);
}
