import { generateOrders, ORDERS_COUNT, type OrderRow, type OrderStatus, type Region } from "./orders";

/**
 * Message protocol between the main thread and this worker.
 *
 * The worker owns its own copy of the 120k dataset (built at module load from
 * the same seeded generator as the main thread — see `orders.ts`), so the main
 * thread never structured-clones rows over `postMessage`. Instead the main
 * thread sends *predicates*: which status/region/search must match and any
 * session-only status overrides.
 *
 * Every request carries a monotonically increasing `reqId`; the worker echoes
 * it back. The main thread drops stale responses (a response whose `reqId`
 * no longer matches the latest request it sent) so fast typing never renders
 * out-of-date totals. This is the documented contract both sides rely on.
 *
 * Incoming:
 *   { action: "aggregate", query: GridQuery, reqId }   -> Outgoing "aggregate"
 *   { action: "exportCsv", query: GridQuery, reqId }   -> Outgoing "exportCsv"
 *
 * Outgoing:
 *   { action: "aggregate", result, ms, reqId }
 *   { action: "exportCsv", csv, count, ms, reqId }
 *   { action: "error", message, reqId }                -> any failed request
 */

export interface Aggregation {
  totalOrders: number;
  totalRevenue: number;
  avgOrder: number;
  byStatus: Record<string, { count: number; revenue: number }>;
  byPayment: Record<string, { count: number; revenue: number }>;
  byRegion: Record<string, { count: number; revenue: number }>;
  byDay: { day: string; count: number; revenue: number }[];
}

/** Predicate describing the visible grid view; mirrors the grid's filters. */
export interface GridQuery {
  search: string;
  status: OrderStatus | "all";
  region: Region | "all";
  statusOverrides: Record<string, OrderStatus>;
}

export type Incoming =
  | { action: "aggregate"; query: GridQuery; reqId: number }
  | { action: "exportCsv"; query: GridQuery; reqId: number };

export type Outgoing =
  | { action: "aggregate"; result: Aggregation; ms: number; reqId: number }
  | { action: "exportCsv"; csv: string; count: number; ms: number; reqId: number }
  | { action: "error"; message: string; reqId: number };

// The DOM lib types `self` as Window, but this file runs as a dedicated web
// worker, so we type the scope explicitly instead of pulling in the whole
// WebWorker lib (which clashes with the DOM lib in a Next.js project).
type WorkerScope = {
  onmessage: ((ev: MessageEvent<Incoming>) => void) | null;
  postMessage: (message: Outgoing) => void;
};

const scope = self as unknown as WorkerScope;

const ORDERS = generateOrders(ORDERS_COUNT);

function aggregate(rows: OrderRow[]): Aggregation {
  const byStatus: Aggregation["byStatus"] = {};
  const byPayment: Aggregation["byPayment"] = {};
  const byRegion: Aggregation["byRegion"] = {};
  const byDay = new Map<string, { count: number; revenue: number }>();

  let totalRevenue = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    totalRevenue += row.total;

    const status = (byStatus[row.status] ??= { count: 0, revenue: 0 });
    status.count++;
    status.revenue += row.total;

    const payment = (byPayment[row.payment] ??= { count: 0, revenue: 0 });
    payment.count++;
    payment.revenue += row.total;

    const region = (byRegion[row.region] ??= { count: 0, revenue: 0 });
    region.count++;
    region.revenue += row.total;

    const day = row.createdAt.slice(0, 10);
    const dayBucket = byDay.get(day);
    if (dayBucket) {
      dayBucket.count++;
      dayBucket.revenue += row.total;
    } else {
      byDay.set(day, { count: 1, revenue: row.total });
    }
  }

  const byDaySorted = [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([day, value]) => ({ day, ...value }));

  return {
    totalOrders: rows.length,
    totalRevenue,
    avgOrder: rows.length ? totalRevenue / rows.length : 0,
    byStatus,
    byPayment,
    byRegion,
    byDay: byDaySorted,
  };
}

/**
 * Applies the grid predicate to the worker's own dataset. Filtering uses the
 * *original* `row.status` and only then applies `statusOverrides`, so a status
 * edit never removes a row from the current filter — matching the main-thread
 * `displayRows` behavior exactly. Search matches against the precomputed
 * lowercase fields (same trick as the grid).
 */
function applyQuery(query: GridQuery): OrderRow[] {
  const needle = query.search.trim().toLowerCase();
  const hasQuery = needle.length > 0 || query.status !== "all" || query.region !== "all";
  if (!hasQuery && Object.keys(query.statusOverrides).length === 0) return ORDERS;

  const out: OrderRow[] = [];
  for (let i = 0; i < ORDERS.length; i++) {
    const row = ORDERS[i];
    if (query.status !== "all" && row.status !== query.status) continue;
    if (query.region !== "all" && row.region !== query.region) continue;
    if (
      needle &&
      !(
        row.customerLower.includes(needle) ||
        row.idLower.includes(needle) ||
        row.regionLower.includes(needle)
      )
    ) {
      continue;
    }
    const override = query.statusOverrides[row.id];
    out.push(override && override !== row.status ? { ...row, status: override } : row);
  }
  return out;
}

/**
 * Serializes rows to CSV. The file starts with a UTF-8 BOM so Excel opens the
 * Arabic column data un-garbled. String fields are quoted and inner quotes
 * doubled; cells beginning with `=`, `+`, `-` or `@` are prefixed with `'` to
 * neutralise spreadsheet formula injection. Numeric cells pass through raw so
 * the `total` column stays numeric in a spreadsheet.
 */
function csvCell(value: string): string {
  if (/^[=+\-@]/.test(value)) return `'${value}`;
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function toCsv(rows: OrderRow[]): string {
  const lines = new Array<string>(rows.length + 1);
  lines[0] = "\uFEFFid,customer,region,payment,status,date,total";
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    lines[i + 1] = [
      csvCell(r.id),
      csvCell(r.customer),
      csvCell(r.region),
      csvCell(r.payment),
      csvCell(r.status),
      csvCell(r.createdAt),
      String(r.total),
    ].join(",");
  }
  return lines.join("\n");
}

scope.onmessage = (ev) => {
  const msg = ev.data;
  const startedAt = performance.now();
  // Every request is wrapped so a failure returns an error envelope instead of
  // leaving the main thread stuck with `computing`/`exporting` = true.
  try {
    if (msg.action === "aggregate") {
      const rows = applyQuery(msg.query);
      scope.postMessage({
        action: "aggregate",
        result: aggregate(rows),
        ms: Math.round((performance.now() - startedAt) * 10) / 10,
        reqId: msg.reqId,
      });
    } else if (msg.action === "exportCsv") {
      const rows = applyQuery(msg.query);
      scope.postMessage({
        action: "exportCsv",
        csv: toCsv(rows),
        count: rows.length,
        ms: Math.round((performance.now() - startedAt) * 10) / 10,
        reqId: msg.reqId,
      });
    }
  } catch (err) {
    scope.postMessage({
      action: "error",
      message: err instanceof Error ? err.message : String(err),
      reqId: msg?.reqId,
    });
  }
};
