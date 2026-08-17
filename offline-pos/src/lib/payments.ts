import { Banknote, CreditCard, Smartphone, Wallet, type LucideIcon } from "lucide-react";
import type { MessageKey } from "../i18n/messages";

export interface PaymentMethodInfo {
  id: "cash" | "card" | "wallet";
  icon: LucideIcon;
  labelKey: MessageKey;
}

/**
 * Single payment-method registry — the ids, the icon, and the i18n label key
 * for each method. Components import this instead of hard-coding a second
 * mapping, so a new method is added in exactly one place.
 */
export const PAYMENT_METHODS = [
  { id: "cash", icon: Banknote, labelKey: "payCash" },
  { id: "card", icon: CreditCard, labelKey: "payCard" },
  { id: "wallet", icon: Smartphone, labelKey: "payWallet" },
] as const satisfies readonly PaymentMethodInfo[];

export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]["id"];

/** Narrow a persisted/unknown value to a known method id, else "cash". */
export function isPaymentMethodId(value: unknown): value is PaymentMethodId {
  return PAYMENT_METHODS.some((m) => m.id === value);
}

/** Icon for a method id (legacy rows fall back to the wallet icon). */
export function paymentMethodIcon(method: string): LucideIcon {
  return PAYMENT_METHODS.find((m) => m.id === method)?.icon ?? Wallet;
}
