import type { Order } from "./types";

/**
 * Column width of a 58 mm thermal till slip. Everything is wrapped to fit so
 * the output can be sent raw to an ESC/POS printer without layout surprises.
 */
export const THERMAL_WIDTH = 32;

/** ESC/POS partial cut (GS V A) — appended after the printed content. */
export const ESC_POS_CUT = "\x1dVA";

export interface ThermalReceiptLabels {
  order: string;
  items: string;
  subtotal: string;
  discount: string;
  total: string;
  cash: string;
  card: string;
  wallet: string;
  savedLocally: string;
  synced: string;
  thankYou: string;
}

export const DEFAULT_THERMAL_LABELS: ThermalReceiptLabels = {
  order: "ORDER",
  items: "ITEMS",
  subtotal: "Subtotal",
  discount: "Discount",
  total: "TOTAL",
  cash: "Cash",
  card: "Card",
  wallet: "Wallet",
  savedLocally: "SAVED LOCALLY",
  synced: "SYNCED TO SERVER",
  thankYou: "THANK YOU",
};

/**
 * Renders an order as plain text for a 58 mm thermal printer. Pure and
 * framework-agnostic (no i18n store, no DOM) so it lives in `src/core/` and
 * can be unit-tested — the UI passes localized labels and the active locale.
 */
export function renderThermalReceipt(
  order: Order,
  options: { labels?: Partial<ThermalReceiptLabels>; locale?: string; currency?: string } = {},
): string {
  const labels: ThermalReceiptLabels = { ...DEFAULT_THERMAL_LABELS, ...options.labels };
  const locale = options.locale ?? "en-US";
  const currency = options.currency ?? "SAR";
  const money = (value: number) => formatThermalMoney(value, locale, currency);

  const lines: string[] = [];

  lines.push(center("OFFLINEPOS"));
  lines.push("");
  lines.push(center(labels.order));
  lines.push(center(order.status === "synced" ? labels.synced : labels.savedLocally));
  lines.push("");
  lines.push(center(order.handle));
  lines.push(center(new Date(order.createdAt).toLocaleString(locale)));
  lines.push(dashes());

  for (const line of order.lines) {
    const name = wrapLine(line.name, THERMAL_WIDTH - 9);
    const qty = `${line.quantity} x`;
    const right = money(line.lineTotal);
    lines.push(`${padRight(qty, 4)} ${padLeft(right, THERMAL_WIDTH - 5)}`);
    for (const part of name) {
      lines.push(`     ${part}`);
    }
  }

  lines.push(dashes());

  lines.push(pair(labels.subtotal, money(order.subtotal)));
  if (order.discount > 0) {
    lines.push(pair(labels.discount, `-${money(order.discount)}`));
  }
  for (const tax of order.taxes) {
    const name =
      tax.type === "percent" && tax.rate !== undefined
        ? `${tax.name} (${Math.round(tax.rate * 100)}%)`
        : tax.name;
    lines.push(pair(name, money(tax.amount)));
  }
  lines.push(pair(labels.total, money(order.total)));
  lines.push(pair(paymentLabel(order.paymentMethod, labels), money(order.total)));

  lines.push(dashes());
  lines.push("");
  lines.push(center(labels.thankYou));
  // Feed out the slip and cut (GS V A).
  lines.push("\n\n\n");
  lines.push(ESC_POS_CUT);

  return lines.join("\n");
}

function paymentLabel(method: string, labels: ThermalReceiptLabels): string {
  if (method === "card") return labels.card;
  if (method === "wallet") return labels.wallet;
  return labels.cash;
}

/** Wraps a line to `width` characters, returning each wrapped segment. */
export function wrapLine(text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current && current.length + 1 + word.length > width) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function formatThermalMoney(value: number, locale: string, currency: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function center(text: string): string {
  if (text.length >= THERMAL_WIDTH) return text.slice(0, THERMAL_WIDTH);
  const left = Math.floor((THERMAL_WIDTH - text.length) / 2);
  return " ".repeat(left) + text;
}

function dashes(): string {
  return "-".repeat(THERMAL_WIDTH);
}

function padLeft(text: string, width: number): string {
  return text.length >= width ? text : " ".repeat(width - text.length) + text;
}

function padRight(text: string, width: number): string {
  return text.length >= width ? text : text + " ".repeat(width - text.length);
}

function pair(label: string, value: string): string {
  const room = THERMAL_WIDTH - value.length;
  const labelPart = label.length > room ? label.slice(0, room) : label;
  return `${labelPart}${" ".repeat(THERMAL_WIDTH - labelPart.length - value.length)}${value}`;
}
