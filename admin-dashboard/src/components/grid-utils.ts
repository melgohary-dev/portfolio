import type { SortingState, VisibilityState, ColumnSizingState } from "@tanstack/react-table";
import {
  ORDER_STATUSES,
  ORDER_REGIONS,
  type OrderRow,
  type Region,
  type OrderStatus,
} from "@/lib/orders";

export const ROW_HEIGHT = 48;
export const VIEWPORT_HEIGHT = 560;
export const PAGE_SIZE = Math.max(1, Math.floor(VIEWPORT_HEIGHT / ROW_HEIGHT));
export const PAGED_PAGE_SIZE = 100;
export const VIEWS_VERSION = 1;
export const VIEWS_KEY = "admin-dashboard:orders-views";
export const LAYOUT_VERSION = 1;
export const LAYOUT_KEY = "admin-dashboard:orders-layout";
export const ALL = "all";
export const COLUMN_IDS = ["id", "customer", "region", "payment", "status", "createdAt", "total"] as const;

export type GridMode = "virtual" | "paged";

export interface SavedView {
  name: string;
  search: string;
  status: string;
  region: string;
  sorting: SortingState;
  columnVisibility: VisibilityState;
  columnSizing: ColumnSizingState;
  savedAt: number;
  version: number;
}

export interface LayoutPrefs {
  columnVisibility: VisibilityState;
  columnSizing: ColumnSizingState;
  version: number;
}

export function matches(row: OrderRow, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return false;
  return (
    row.customerLower.includes(needle) ||
    row.idLower.includes(needle) ||
    row.regionLower.includes(needle)
  );
}

export function isAllowedStatus(v: unknown): v is OrderStatus {
  return ORDER_STATUSES.includes(v as OrderStatus);
}

export function isAllowedRegion(v: unknown): v is Region {
  return ORDER_REGIONS.includes(v as Region);
}

export function coerceColumnState<T>(v: unknown, keys: string[]): Record<string, T> {
  if (typeof v !== "object" || v === null) return {};
  const out: Record<string, T> = {};
  for (const [key, value] of Object.entries(v)) {
    if (keys.includes(key) && (typeof value === "boolean" || typeof value === "number")) {
      out[key] = value as T;
    }
  }
  return out;
}

export function sanitizeSorting(v: unknown): SortingState {
  if (!Array.isArray(v)) return [];
  return v
    .filter(
      (s) =>
        typeof s === "object" &&
        s !== null &&
        typeof s.id === "string" &&
        COLUMN_IDS.includes(s.id as (typeof COLUMN_IDS)[number]) &&
        (s.desc === true || s.desc === false),
    )
    .map((s) => ({ id: String(s.id), desc: Boolean(s.desc) }));
}

export function parseSavedViews(raw: string | null): SavedView[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (v): v is SavedView =>
        typeof v === "object" &&
        v !== null &&
        typeof v.name === "string" &&
        typeof v.search === "string" &&
        (v.status === ALL || isAllowedStatus(v.status)) &&
        (v.region === ALL || isAllowedRegion(v.region)),
    );
  } catch {
    return [];
  }
}

export function parseLayoutPrefs(raw: string | null): LayoutPrefs | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const p = parsed as Record<string, unknown>;
    return {
      columnVisibility: coerceColumnState<boolean>(p.columnVisibility, [...COLUMN_IDS]),
      columnSizing: coerceColumnState<number>(p.columnSizing, [...COLUMN_IDS]),
      version: LAYOUT_VERSION,
    };
  } catch {
    return null;
  }
}
