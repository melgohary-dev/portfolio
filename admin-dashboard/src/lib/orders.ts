import type { Order, OrderStatus, PaymentMethod } from "./data";

export type { OrderStatus, PaymentMethod } from "./data";
export type Region = "Riyadh" | "Jeddah" | "Dammam" | "Mecca";

/**
 * Order with an extra `region` dimension plus precomputed lowercase search
 * fields. The lowercase copies are built once at generation time so the
 * 120k-row search filter never lowercases per keystroke.
 */
export interface OrderRow extends Order {
  region: Region;
  idLower: string;
  customerLower: string;
  regionLower: string;
}

export const ORDERS_COUNT = 120_000;

/**
 * Deterministic pseudo-random generator (mulberry32). Seeded, so every reload
 * and every browser produces the exact same 120k orders — good for demos and
 * for keeping saved views meaningful.
 */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  "Salma", "Omar", "Noura", "Khalid", "Layla", "Fahad", "Aisha", "Yousef",
  "Maha", "Bandar", "Reem", "Sultan", "Hind", "Nasser", "Ghadah", "Turki",
  "Sara", "Abdullah", "Dana", "Majed", "Rania", "Saud", "Lama", "Hussein",
];

const LAST_NAMES = [
  "Al-Rashid", "Farouk", "Hassan", "Mansour", "Ali", "Al-Dossari",
  "Al-Otaibi", "Al-Qahtani", "Al-Shammari", "Al-Mutairi", "Al-Harbi",
  "Al-Zahrani", "Al-Ghamdi", "Al-Anazi", "Al-Subaie", "Al-Tamimi",
];

const REGIONS: { name: Region; weight: number }[] = [
  { name: "Riyadh", weight: 0.4 },
  { name: "Jeddah", weight: 0.3 },
  { name: "Dammam", weight: 0.18 },
  { name: "Mecca", weight: 0.12 },
];

const STATUSES: { name: OrderStatus; weight: number }[] = [
  { name: "paid", weight: 0.78 },
  { name: "pending", weight: 0.15 },
  { name: "refunded", weight: 0.07 },
];

const PAYMENTS: { name: PaymentMethod; weight: number }[] = [
  { name: "card", weight: 0.45 },
  { name: "wallet", weight: 0.3 },
  { name: "cash", weight: 0.25 },
];

function pickWeighted<T extends { name: string; weight: number }>(
  rand: () => number,
  items: T[],
): T["name"] {
  const roll = rand();
  let acc = 0;
  for (const item of items) {
    acc += item.weight;
    if (roll <= acc) return item.name;
  }
  return items[items.length - 1].name;
}

/**
 * Deterministic dataset generator. `mulberry32(seed)` is seeded and `now` is
 * pinned, so every reload — and every Web Worker importing this module —
 * produces byte-identical rows. That determinism is what lets the worker own
 * its own copy of the 120k dataset without the main thread ever shipping it
 * over `postMessage`.
 */
export function generateOrders(count: number): OrderRow[] {
  const rand = mulberry32(20260814);
  const DAY = 86_400_000;
  // Fixed "now" so the dataset is byte-identical on every visit.
  const now = Date.UTC(2026, 7, 14, 12, 0, 0);
  const rows = new Array<OrderRow>(count);
  for (let i = 0; i < count; i++) {
    const status = pickWeighted(rand, STATUSES);
    const id = `ORD-${String(i + 1).padStart(6, "0")}`;
    const customer = `${FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)]} ${
      LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)]
    }`;
    const region = pickWeighted(rand, REGIONS);
    rows[i] = {
      id,
      customer,
      idLower: id.toLowerCase(),
      customerLower: customer.toLowerCase(),
      regionLower: region.toLowerCase(),
      total: Math.round(20 + rand() * 780),
      status,
      payment: pickWeighted(rand, PAYMENTS),
      createdAt: new Date(
        now - Math.floor(rand() * 365 * DAY) - Math.floor(rand() * DAY),
      ).toISOString(),
      region,
    };
  }
  return rows;
}

let cached: OrderRow[] | null = null;

/**
 * Lazy, memoized accessor for the main-thread copy of the dataset (used for
 * grid rendering). The worker builds its own copy from `generateOrders` — the
 * count is a fixed module constant because the two copies must agree exactly.
 */
export function getOrders(): OrderRow[] {
  if (!cached) cached = generateOrders(ORDERS_COUNT);
  return cached;
}

export const ORDER_STATUSES: OrderStatus[] = ["paid", "pending", "refunded"];
export const ORDER_REGIONS: Region[] = ["Riyadh", "Jeddah", "Dammam", "Mecca"];
