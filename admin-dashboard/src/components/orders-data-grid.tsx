"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnSizingState,
  type Row,
  type VisibilityState,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Check,
  Columns3,
  Download,
  LayoutGrid,
  Loader2,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { useSettings } from "@/components/settings-provider";
import { StatusBadge } from "@/components/status-badge";
import { tPayment, tStatus } from "@/lib/i18n";
import {
  getOrders,
  ORDER_REGIONS,
  ORDER_STATUSES,
  type OrderRow,
  type Region,
  type OrderStatus,
} from "@/lib/orders";
import { useOrdersAggregation } from "@/lib/use-orders-aggregation";
import type { GridQuery, Outgoing } from "@/lib/orders-worker";
import { cn } from "@/lib/utils";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    pinned?: "left" | "right";
  }
}

const columnHelper = createColumnHelper<OrderRow>();
const ROW_HEIGHT = 48;
const VIEWPORT_HEIGHT = 560;
// One page fills exactly one viewport, so PageUp/PageDown land on the first
// fully visible row.
const PAGE_SIZE = Math.max(1, Math.floor(VIEWPORT_HEIGHT / ROW_HEIGHT));
const PAGED_PAGE_SIZE = 100;
// Persistence schemas are versioned so a future reader can migrate or reject
// data written by an older build. See `parseSavedViews` / `parseLayoutPrefs`.
const VIEWS_VERSION = 1;
const VIEWS_KEY = "admin-dashboard:orders-views";
const LAYOUT_VERSION = 1;
const LAYOUT_KEY = "admin-dashboard:orders-layout";

type GridMode = "virtual" | "paged";

interface SavedView {
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

interface LayoutPrefs {
  columnVisibility: VisibilityState;
  columnSizing: ColumnSizingState;
  version: number;
}

const ALL = "all";

/** Column ids as stored in `SavedView` / `LayoutPrefs`; used to coerce persisted state. */
const COLUMN_IDS = ["id", "customer", "region", "payment", "status", "createdAt", "total"] as const;

/**
 * Case-insensitive match over the grid's searchable fields. `idLower`,
 * `customerLower` and `regionLower` are precomputed at generation time
 * (`orders.ts`), so filtering 120k rows never re-lowercases per pass.
 */
function matches(row: OrderRow, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return false;
  return (
    row.customerLower.includes(needle) ||
    row.idLower.includes(needle) ||
    row.regionLower.includes(needle)
  );
}

function isAllowedStatus(v: unknown): v is OrderStatus {
  return ORDER_STATUSES.includes(v as OrderStatus);
}

function isAllowedRegion(v: unknown): v is Region {
  return ORDER_REGIONS.includes(v as Region);
}

/** Best-effort coercion of persisted column layout, falling back to `{}`. */
function coerceColumnState<T>(v: unknown, keys: string[]): Record<string, T> {
  if (typeof v !== "object" || v === null) return {};
  const out: Record<string, T> = {};
  for (const [key, value] of Object.entries(v)) {
    if (keys.includes(key) && (typeof value === "boolean" || typeof value === "number")) {
      out[key] = value as T;
    }
  }
  return out;
}

function sanitizeSorting(v: unknown): SortingState {
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

function parseSavedViews(raw: string | null): SavedView[] {
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

function parseLayoutPrefs(raw: string | null): LayoutPrefs | null {
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

/**
 * Keeps keyboard focus inside an open popover: wraps Tab, closes on Escape and
 * returns focus to the trigger button, and moves focus into the panel on open.
 */
function useFocusTrap(
  open: boolean,
  onClose: () => void,
  restoreRef: React.RefObject<HTMLButtonElement | null>,
) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const panel = ref.current;
    if (!panel) return;

    const focusable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      );

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        restoreRef.current?.focus();
      } else if (e.key === "Tab") {
        const items = focusable();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    panel.addEventListener("keydown", onKeyDown);
    const raf = requestAnimationFrame(() => focusable()[0]?.focus());
    return () => {
      cancelAnimationFrame(raf);
      panel.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, restoreRef]);

  return ref;
}

interface VirtualOrderRowProps {
  row: Row<OrderRow>;
  index: number;
  /** Absolute translateY offset from the virtualizer. */
  start: number;
  isActive: boolean;
  /** Re-render key when the visible column set changes. */
  colVisibilityKey: string;
  /** Re-render key when any column width changes. */
  sizingKey: string;
  flexId: string | null;
  flexWidth: number;
  onKeyDown: (e: ReactKeyboardEvent<HTMLElement>, index: number) => void;
  onActivate: (index: number) => void;
  rowElsRef: React.MutableRefObject<Map<number, HTMLTableRowElement>>;
}

/**
 * Memoized row for the virtualized table. Props are plain values + stable
 * callbacks, so keyboard/scroll hover state changes re-render only the
 * affected rows instead of every mounted row. TanStack rows are referentially
 * stable unless data/sort/visibility actually changed, which makes this memo
 * effective. Row height and the pinned/flex column widths are computed inside
 * (they derive from table state the props already capture).
 */
const VirtualOrderRow = memo(function VirtualOrderRow({
  row,
  index,
  start,
  isActive,
  flexId,
  flexWidth,
  onKeyDown,
  onActivate,
  rowElsRef,
}: VirtualOrderRowProps) {
  return (
    <tr
      key={row.id}
      ref={(el) => {
        const map = rowElsRef.current;
        if (el) map.set(index, el);
        else map.delete(index);
      }}
      role="row"
      // +2: the header row occupies aria-rowindex 1, data rows start at 2.
      aria-rowindex={index + 2}
      tabIndex={isActive ? 0 : -1}
      data-index={index}
      onKeyDown={(e) => onKeyDown(e, index)}
      onClick={() => onActivate(index)}
      onFocus={() => onActivate(index)}
      className={cn(
        "group absolute inset-x-0 top-0 hover:bg-slate-50/80 dark:hover:bg-slate-800/40",
        isActive &&
          "bg-blue-50/40 focus:bg-blue-50/60 dark:bg-blue-950/20 dark:focus:bg-blue-950/40",
        "focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500",
      )}
      style={{
        transform: `translateY(${start}px)`,
        height: ROW_HEIGHT,
      }}
    >
      {row.getVisibleCells().map((cell) => {
        const pinned = cell.column.columnDef.meta?.pinned;
        return (
          <td
            key={cell.id}
            role="gridcell"
            className={cn(
              "border-b border-slate-100 px-5 py-0 text-slate-600 dark:border-slate-800 dark:text-slate-300",
              pinned === "left" && "sticky z-10 start-0 bg-white dark:bg-slate-900",
              pinned === "right" &&
                "sticky z-10 end-0 bg-white text-end dark:bg-slate-900",
            )}
            style={{
              width:
                cell.column.id === flexId ? flexWidth : cell.column.getSize(),
              height: ROW_HEIGHT,
            }}
          >
            <div
              className={cn(
                "flex h-full items-center",
                pinned === "right" && "justify-end",
                cell.column.id === "id" &&
                  "font-medium text-slate-800 dark:text-slate-100",
              )}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </div>
          </td>
        );
      })}
    </tr>
  );
});

export function OrdersDataGrid() {
  const { t, formatMoney } = useSettings();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const {
    aggregation,
    ms: aggregateMs,
    computing,
    error: aggregationError,
    workerRef,
    aggregate,
  } = useOrdersAggregation();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderStatus | typeof ALL>(ALL);
  const [region, setRegion] = useState<Region | typeof ALL>(ALL);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [columnsOpen, setColumnsOpen] = useState(false);
  /** Width of the scroll container, so the grid can stretch to fill it. */
  const [containerWidth, setContainerWidth] = useState(0);
  /** Session-only optimistic status edits: `rowId -> status`. */
  const [statusOverrides, setStatusOverrides] = useState<Record<string, OrderStatus>>({});

  const [views, setViews] = useState<SavedView[]>([]);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [selectedView, setSelectedView] = useState("");
  const [exporting, setExporting] = useState(false);

  /** Rendering strategy: full row virtualization vs. infinite pagination. */
  const [mode, setMode] = useState<GridMode>("virtual");
  const [loadedPages, setLoadedPages] = useState(1);
  const [pagingMore, setPagingMore] = useState(false);

  /** Data-row index of the keyboard-focused row. */
  const [activeIndex, setActiveIndex] = useState(0);
  /** Bumped whenever the filtered count changes so the live region re-announces. */
  const [liveTick, setLiveTick] = useState(0);
  const rowEls = useRef<Map<number, HTMLTableRowElement>>(new Map());
  const columnsButtonRef = useRef<HTMLButtonElement | null>(null);
  const viewsButtonRef = useRef<HTMLButtonElement | null>(null);

  const closeColumns = useCallback(() => setColumnsOpen(false), []);
  const closeViews = useCallback(() => setViewMenuOpen(false), []);
  const columnsMenuRef = useFocusTrap(columnsOpen, closeColumns, columnsButtonRef);
  const viewsMenuRef = useFocusTrap(viewMenuOpen, closeViews, viewsButtonRef);

  const rows = useMemo(() => getOrders(), []);

  // The raw search drives the input; `debouncedSearch` drives the expensive
  // 120k-row filter so typing filters once per pause, not per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    try {
      setViews(parseSavedViews(localStorage.getItem(VIEWS_KEY)));
      const prefs = parseLayoutPrefs(localStorage.getItem(LAYOUT_KEY));
      if (prefs) {
        setColumnVisibility(prefs.columnVisibility);
        setColumnSizing(prefs.columnSizing);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim();
    if (!q && status === ALL && region === ALL) return rows;
    return rows.filter((row) => {
      if (status !== ALL && row.status !== status) return false;
      if (region !== ALL && row.region !== region) return false;
      if (q && !matches(row, q)) return false;
      return true;
    });
  }, [rows, debouncedSearch, status, region]);

  // View-level status edits (optimistic, session-only) applied after filtering
  // so a status change never silently removes the row from the current filter.
  const displayRows = useMemo(() => {
    const keys = Object.keys(statusOverrides);
    if (keys.length === 0) return filtered;
    return filtered.map((row) => {
      const next = statusOverrides[row.id];
      return next && next !== row.status ? { ...row, status: next } : row;
    });
  }, [filtered, statusOverrides]);

  // Re-announce the result count to screen readers whenever the visible set
  // changes (filters, search, page size); `liveTick` guarantees the region
  // fires even when the count is numerically identical to the last one.
  useEffect(() => {
    setLiveTick((n) => n + 1);
  }, [displayRows.length]);

  // In paged mode only the loaded pages are handed to the table; the virtualizer
  // then bounds mounted DOM rows exactly like virtual mode. Memoized so the
  // table keeps a stable `data` reference between page loads — otherwise
  // getRowModel()/getSortedRowModel() re-sort 120k rows on every render.
  const gridData = useMemo(
    () =>
      mode === "paged"
        ? displayRows.slice(0, loadedPages * PAGED_PAGE_SIZE)
        : displayRows,
    [mode, displayRows, loadedPages],
  );

  // Re-aggregate the visible/edited set on the worker, debounced. The initial
  // full-dataset pass already ran inside the hook on mount, so we only fire
  // when the view actually diverges from the full dataset. The worker filters
  // its own copy using the same predicate, so no 120k rows cross postMessage.
  useEffect(() => {
    if (displayRows === rows) return;
    const id = setTimeout(() => {
      aggregate({ search: debouncedSearch, status, region, statusOverrides } satisfies GridQuery);
    }, 300);
    return () => clearTimeout(id);
  }, [displayRows, rows, aggregate, debouncedSearch, status, region, statusOverrides]);

  // Remember the last column layout so a refresh restores the user's view.
  useEffect(() => {
    try {
      localStorage.setItem(
        LAYOUT_KEY,
        JSON.stringify({ columnVisibility, columnSizing, version: LAYOUT_VERSION } satisfies LayoutPrefs),
      );
    } catch {
      /* ignore */
    }
  }, [columnVisibility, columnSizing]);

  // Track the visible width so the grid stretches to fill the container even
  // when the pinned columns alone are narrower than the viewport.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // In paged mode, restart from page 1 whenever the view (filters, sort, mode)
  // changes and snap the scroll position back to the top.
  useEffect(() => {
    if (mode === "paged") {
      setLoadedPages(1);
      scrollRef.current?.scrollTo({ top: 0 });
    }
  }, [mode, debouncedSearch, status, region, sorting]);

  // Clean up the paging timeout on unmount (the grid remounts on navigation).
  const loadMoreTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (loadMoreTimer.current !== null) window.clearTimeout(loadMoreTimer.current);
    },
    [],
  );

  const loadMore = useCallback(() => {
    if (mode !== "paged" || pagingMore) return;
    if (loadedPages * PAGED_PAGE_SIZE >= displayRows.length) return;
    setPagingMore(true);
    if (loadMoreTimer.current !== null) window.clearTimeout(loadMoreTimer.current);
    loadMoreTimer.current = window.setTimeout(() => {
      loadMoreTimer.current = null;
      setLoadedPages((p) => p + 1);
      setPagingMore(false);
    }, 120);
  }, [mode, pagingMore, loadedPages, displayRows.length]);

  // Scroll is hot in paged mode; gate it behind a rAF so at most one
  // proximity check (and page load) happens per frame.
  const scrollRaf = useRef(0);
  const handleScroll = useCallback(() => {
    if (mode !== "paged" || pagingMore) return;
    if (scrollRaf.current) return;
    scrollRaf.current = requestAnimationFrame(() => {
      scrollRaf.current = 0;
      const el = scrollRef.current;
      if (!el) return;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 400) loadMore();
    });
  }, [mode, pagingMore, loadMore]);
  useEffect(
    () => () => {
      if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current);
    },
    [],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("id", {
        header: t("dashboard.order"),
        size: 140,
        meta: { pinned: "left" },
      }),
      columnHelper.accessor("customer", {
        header: t("dashboard.customer"),
        size: 230,
      }),
      columnHelper.accessor("region", {
        header: t("grid.region"),
        size: 120,
      }),
      columnHelper.accessor("payment", {
        header: t("dashboard.payment"),
        size: 110,
        cell: ({ getValue }) => (
          <span className="capitalize">{t(tPayment(getValue()))}</span>
        ),
      }),
      columnHelper.accessor("status", {
        header: t("dashboard.status"),
        size: 140,
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <span className="relative inline-block">
              <StatusBadge
                status={status}
                label={t(tStatus(status))}
              />
              <select
                value={status}
                aria-label={t("grid.editStatus")}
                tabIndex={-1}
                onChange={(e) =>
                  setStatusOverrides((prev) => ({
                    ...prev,
                    [row.original.id]: e.target.value as OrderStatus,
                  }))
                }
                title={t("grid.editStatus")}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(tStatus(s))}
                  </option>
                ))}
              </select>
            </span>
          );
        },
      }),
      columnHelper.accessor("createdAt", {
        header: t("dashboard.date"),
        size: 130,
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap text-slate-700 dark:text-slate-400">
            {new Date(getValue()).toLocaleDateString()}
          </span>
        ),
      }),
      columnHelper.accessor("total", {
        header: t("dashboard.totalColumn"),
        size: 120,
        meta: { pinned: "right" },
        cell: ({ getValue }) => (
          <span className="tabular font-semibold text-slate-800 dark:text-slate-100">
            {formatMoney(getValue())}
          </span>
        ),
      }),
    ],
    [t, formatMoney],
  );

  // React Compiler can't memoize TanStack Table's returned functions, but the
  // hook manages its own state/effects — the component is fine without memo.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: gridData,
    columns,
    state: { sorting, columnVisibility, columnSizing },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // The virtualized rows are absolutely positioned, so fixed px column widths
  // never stretch to fill the container on their own. Pick the first visible
  // non-pinned column as a flexible one and let it absorb any slack:
  //   overflow = max(containerWidth - sumOfAllColumnWidths, 0)
  //   flexWidth = flexColumnBaseWidth + overflow
  //   table min-width = max(sumOfAllColumnWidths, containerWidth)
  // Because the flex column is `relative`/stretch-free, its header and cells
  // both need this explicit computed width rather than the fixed `size`.
  const flexCol = table
    .getAllLeafColumns()
    .find((c) => c.getIsVisible() && !c.getIsPinned());
  const flexId = flexCol?.id ?? null;
  const flexSize = flexCol?.getSize() ?? 0;
  const sumFixed = table.getTotalSize();
  const overflow = containerWidth > sumFixed ? containerWidth - sumFixed : 0;
  const flexWidth = flexCol ? flexSize + overflow : flexSize;
  const totalWidth = Math.max(sumFixed, containerWidth);

  // Stable identity keys for the memoized rows: change only when the visible
  // column set or any width actually changes.
  const colVisibilityKey = JSON.stringify(columnVisibility);
  const sizingKey = JSON.stringify(columnSizing);

  const rowModel = table.getRowModel().rows;
  const getScrollElement = useCallback(() => scrollRef.current, []);
  const estimateSize = useCallback(() => ROW_HEIGHT, []);
  const virtualizer = useVirtualizer({
    count: rowModel.length,
    getScrollElement,
    estimateSize,
    // 6 rows of overscan (~288px) is enough to pre-render past the viewport;
    // 12 previously mounted ~576px of off-screen rows.
    overscan: 6,
  });

  // Ref mirrors of render-time values so the keyboard handler stays referentially
  // stable (the memoized rows depend on it) without reading stale closures.
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  const rowModelLenRef = useRef(rowModel.length);
  rowModelLenRef.current = rowModel.length;

  const setActiveRow = useCallback((index: number) => {
    activeIndexRef.current = index;
    setActiveIndex(index);
  }, []);

  const focusRow = useCallback((index: number): boolean => {
    const el = rowEls.current.get(index);
    if (el) {
      el.focus();
      return true;
    }
    return false;
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const last = rowModelLenRef.current - 1;
      if (last < 0) return;
      const clamped = Math.max(0, Math.min(index, last));
      if (mode === "paged" && clamped >= rowModelLenRef.current - 5) loadMore();
      if (clamped === activeIndexRef.current) {
        focusRow(clamped);
        return;
      }
      setActiveRow(clamped);
      virtualizer.scrollToIndex(clamped, { align: "auto" });
      // The virtualized row isn't in the DOM until the virtualizer has laid out
      // the target offset; retry across animation frames (max ~40) until it is.
      let tries = 0;
      const retry = () => {
        if (tries++ >= 40) return;
        if (!focusRow(clamped)) requestAnimationFrame(retry);
      };
      requestAnimationFrame(retry);
    },
    [mode, loadMore, setActiveRow, focusRow, virtualizer],
  );

  const handleRowKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLElement>, index: number) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          goTo(index + 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          goTo(index - 1);
          break;
        case "Home":
          e.preventDefault();
          goTo(0);
          break;
        case "End":
          e.preventDefault();
          goTo(rowModelLenRef.current - 1);
          break;
        case "PageDown":
          e.preventDefault();
          goTo(index + PAGE_SIZE);
          break;
        case "PageUp":
          e.preventDefault();
          goTo(index - PAGE_SIZE);
          break;
        case "Enter":
          e.preventDefault();
          rowEls.current
            .get(index)
            ?.querySelector<HTMLSelectElement>("select[aria-label]")
            ?.focus();
          break;
      }
    },
    [goTo],
  );

  // CSV export round-trips through the shared worker, which renders the CSV
  // from its own copy of the data — no rows cross postMessage. The response is
  // matched by request id, guarded by a fail-safe timeout, and cleaned up on
  // unmount so `exporting` can never stay wedged.
  const exportStateRef = useRef<{
    timer: number | null;
    worker: Worker | null;
    onMessage: ((e: MessageEvent<Outgoing>) => void) | null;
  }>({ timer: null, worker: null, onMessage: null });
  useEffect(
    () => () => {
      const st = exportStateRef.current;
      if (st.timer !== null) window.clearTimeout(st.timer);
      if (st.worker && st.onMessage) st.worker.removeEventListener("message", st.onMessage);
    },
    [],
  );

  const exportCsv = () => {
    const worker = workerRef.current;
    if (!worker || exporting) return; // worker-gone or already exporting
    setExporting(true);
    const reqId = Date.now();
    const onMessage = (e: MessageEvent<Outgoing>) => {
      const data = e.data;
      if (!data || data.action !== "exportCsv" || data.reqId !== reqId) return;
      if (exportStateRef.current.timer !== null) {
        window.clearTimeout(exportStateRef.current.timer);
        exportStateRef.current.timer = null;
      }
      worker.removeEventListener("message", onMessage);
      exportStateRef.current.onMessage = null;
      const blob = new Blob([data.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "orders.csv";
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
    };
    worker.addEventListener("message", onMessage);
    exportStateRef.current = { timer: null, worker, onMessage };
    try {
      worker.postMessage({
        action: "exportCsv",
        query: { search: debouncedSearch, status, region, statusOverrides } satisfies GridQuery,
        reqId,
      });
      exportStateRef.current.timer = window.setTimeout(() => {
        // Fail-safe: if the response never arrives (terminated worker, lost
        // message), reset the state instead of disabling the button forever.
        worker.removeEventListener("message", onMessage);
        exportStateRef.current.onMessage = null;
        setExporting(false);
      }, 15000);
    } catch {
      worker.removeEventListener("message", onMessage);
      exportStateRef.current.onMessage = null;
      setExporting(false);
    }
  };

  const saveView = () => {
    const name = viewName.trim();
    if (!name) return;
    const view: SavedView = {
      name,
      version: VIEWS_VERSION,
      search,
      status,
      region,
      sorting,
      columnVisibility,
      columnSizing,
      savedAt: Date.now(),
    };
    const next = [...views.filter((v) => v.name !== name), view];
    setViews(next);
    try {
      localStorage.setItem(VIEWS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setViewName("");
    setViewMenuOpen(false);
  };

  // Read path mirrors the sanitizers used at load time: each field is
  // validated per-field and falls back to a safe default, so a hand-edited or
  // older stored view can never hand the `<select>`s an invalid value (which
  // would render as a blank option with a stale saved view name in the list).
  const loadView = () => {
    const view = views.find((v) => v.name === selectedView);
    if (!view) return;
    setSearch(view.search ?? "");
    setStatus(isAllowedStatus(view.status) ? view.status : ALL);
    setRegion(isAllowedRegion(view.region) ? view.region : ALL);
    setSorting(sanitizeSorting(view.sorting));
    setColumnVisibility(coerceColumnState<boolean>(view.columnVisibility ?? {}, [...COLUMN_IDS]));
    setColumnSizing(coerceColumnState<number>(view.columnSizing ?? {}, [...COLUMN_IDS]));
  };

  const deleteView = () => {
    const next = views.filter((v) => v.name !== selectedView);
    setViews(next);
    setSelectedView("");
    try {
      localStorage.setItem(VIEWS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("grid.search")}
            className="w-full rounded-xl border-0 bg-white py-2 ps-9 pe-3 text-sm text-slate-900 shadow-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-800"
          />
        </label>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus | typeof ALL)}
          aria-label={t("grid.statusAll")}
          className="rounded-xl border-0 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800"
        >
          <option value={ALL}>{t("grid.statusAll")}</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(tStatus(s))}
            </option>
          ))}
        </select>

        <select
          value={region}
          onChange={(e) => setRegion(e.target.value as Region | typeof ALL)}
          aria-label={t("grid.regionAll")}
          className="rounded-xl border-0 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800"
        >
          <option value={ALL}>{t("grid.regionAll")}</option>
          {ORDER_REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <div
          role="group"
          aria-label={t("grid.modeLabel")}
          className="inline-flex rounded-xl bg-white p-0.5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
        >
          {(["virtual", "paged"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                mode === m
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100",
              )}
            >
              {m === "virtual" ? t("grid.modeVirtual") : t("grid.modePaged")}
            </button>
          ))}
        </div>

        <div className="relative">
          <button
            type="button"
            ref={columnsButtonRef}
            onClick={() => setColumnsOpen((open) => !open)}
            aria-haspopup="true"
            aria-expanded={columnsOpen}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800 dark:hover:bg-slate-800"
          >
            <Columns3 className="h-4 w-4" />
            {t("grid.columns")}
          </button>
          {columnsOpen && (
            <div
              ref={columnsMenuRef}
              role="menu"
              className="absolute end-0 z-40 mt-2 w-64 rounded-xl bg-white p-3 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
            >
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-400">
                  {t("grid.columns")}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setColumnVisibility(
                      table.getAllLeafColumns().reduce(
                        (acc, col) => ({ ...acc, [col.id]: true }),
                        {},
                      ),
                    )
                  }
                  className="cursor-pointer text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                >
                  {t("grid.showAll")}
                </button>
              </div>
              <div className="space-y-0.5">
                {table.getAllLeafColumns().map((col) => (
                  <label
                    key={col.id}
                    className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <span className="truncate">
                      {typeof col.columnDef.header === "string"
                        ? col.columnDef.header
                        : col.id}
                    </span>
                    <input
                      type="checkbox"
                      checked={col.getIsVisible()}
                      onChange={col.getToggleVisibilityHandler()}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={exportCsv}
          disabled={exporting}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {exporting ? t("grid.exporting") : t("grid.exportCsv")}
        </button>

        <div className="relative">
          <button
            type="button"
            ref={viewsButtonRef}
            onClick={() => setViewMenuOpen((open) => !open)}
            aria-haspopup="true"
            aria-expanded={viewMenuOpen}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800 dark:hover:bg-slate-800"
          >
            <Save className="h-4 w-4" />
            {t("grid.saveView")}
          </button>
          {viewMenuOpen && (
            <div
              ref={viewsMenuRef}
              role="menu"
              className="absolute end-0 z-40 mt-2 w-64 rounded-xl bg-white p-3 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
            >
              <div className="flex gap-2">
                <input
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveView()}
                  placeholder={t("grid.viewName")}
                  className="min-w-0 flex-1 rounded-lg border-0 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700"
                />
                <button
                  type="button"
                  onClick={saveView}
                  className="inline-flex cursor-pointer items-center rounded-lg bg-blue-600 px-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Check className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-400">
                  {t("grid.savedViews")}
                </p>
                {views.length === 0 ? (
                  <p className="text-xs text-slate-600 dark:text-slate-400">{t("grid.noSavedViews")}</p>
                ) : (
                  <div className="space-y-1">
                    {views.map((view) => (
                      <div
                        key={view.name}
                        className="flex items-center gap-2 text-sm"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedView(view.name)}
                          className="min-w-0 flex-1 truncate rounded-lg px-2 py-1 text-start text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          {view.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedView(view.name);
                            loadView();
                          }}
                          className="shrink-0 cursor-pointer text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {t("grid.loadView")}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedView(view.name);
                            deleteView();
                          }}
                          aria-label={t("grid.deleteView")}
                          className="shrink-0 cursor-pointer text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-sm text-slate-700 dark:text-slate-400">
        {t("grid.showing")}{" "}
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {displayRows.length.toLocaleString()}
        </span>{" "}
        {t("grid.of")}{" "}
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {rows.length.toLocaleString()}
        </span>
        {displayRows.length !== rows.length &&
          aggregation &&
          ` · ${formatMoney(aggregation.totalRevenue)}`}
      </p>

      {/* Web Worker aggregation strip */}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <LayoutGrid className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            {t("grid.aggregate")}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                displayRows === rows
                  ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  : "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300",
              )}
            >
              {displayRows === rows
                ? t("grid.aggregateScope")
                : `${t("grid.aggregateScopeFiltered")} · ${displayRows.length.toLocaleString()}`}
            </span>
          </p>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {aggregationError ? (
              <span role="alert" className="font-semibold text-red-600 dark:text-red-400">
                {t("grid.aggregateError")}
              </span>
            ) : aggregateMs === null || computing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              `${aggregateMs} ${t("grid.ms")}`
            )}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AggCard
            label={t("dashboard.orders")}
            value={aggregation?.totalOrders.toLocaleString() ?? "—"}
            loading={aggregation === null || computing}
          />
          <AggCard
            label={t("dashboard.totalRevenue")}
            value={
              aggregation ? formatMoney(aggregation.totalRevenue) : "—"
            }
            loading={aggregation === null || computing}
          />
          <AggCard
            label={t("grid.avgOrder")}
            value={aggregation ? formatMoney(aggregation.avgOrder) : "—"}
            loading={aggregation === null || computing}
          />
          <AggCard
            label={t("dashboard.status")}
            value={ORDER_STATUSES.map((s) => t(tStatus(s))).join(" · ")}
            loading={aggregation === null || computing}
            sub={
              aggregation
                ? ORDER_STATUSES.map((s) => {
                    const b = aggregation.byStatus[s];
                    return b
                      ? `${t(tStatus(s))} ${b.count.toLocaleString()}`
                      : null;
                  })
                    .filter(Boolean)
                    .join(" · ")
                : undefined
            }
          />
        </div>
        <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
          {t("grid.aggregateHint")}
        </p>
      </div>

      {/* Virtualized table */}
      <div
        ref={scrollRef}
        data-testid="grid-scroll"
        onScroll={handleScroll}
        className="overflow-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
        style={{ height: VIEWPORT_HEIGHT }}
      >
        <span className="sr-only">{t("grid.kbdHint")}</span>
        <table
          role="grid"
          aria-label={t("grid.ordersGrid")}
          aria-rowcount={rowModel.length + 1}
          aria-colcount={table.getVisibleLeafColumns().length}
          className="relative w-full border-separate border-spacing-0 text-start text-sm"
          style={{ minWidth: totalWidth, tableLayout: "fixed" }}
        >
          <thead role="rowgroup">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} role="row" aria-rowindex={1}>
                {headerGroup.headers.map((header) => {
                  const pinned = header.column.columnDef.meta?.pinned;
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      scope="col"
                      role="columnheader"
                      aria-sort={
                        sorted === "asc"
                          ? "ascending"
                          : sorted === "desc"
                            ? "descending"
                            : undefined
                      }
                      tabIndex={header.column.getCanSort() ? 0 : undefined}
                      className={cn(
                        "sticky top-0 z-20 border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/95 dark:text-slate-400",
                        pinned === "left" && "z-30 start-0",
                        pinned === "right" && "z-30 end-0",
                        header.column.getCanSort() &&
                          "cursor-pointer select-none focus:outline-2 focus:outline-blue-500",
                      )}
                      style={{
                        width:
                          header.column.id === flexId
                            ? flexWidth
                            : header.getSize(),
                      }}
                      onClick={
                        header.column.getCanSort()
                          ? header.column.getToggleSortingHandler()
                          : undefined
                      }
                      onKeyDown={(e) => {
                        if (!header.column.getCanSort()) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          header.column.toggleSorting();
                        }
                      }}
                    >
                      <span
                        className={cn(
                          "relative flex items-center gap-1 px-5 py-3",
                          pinned === "right" && "justify-end",
                        )}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {header.column.getCanSort() &&
                          (header.column.getIsSorted() === "asc" ? (
                            <span className="text-blue-600 dark:text-blue-400">▲</span>
                          ) : header.column.getIsSorted() === "desc" ? (
                            <span className="text-blue-600 dark:text-blue-400">▼</span>
                          ) : (
                            <span className="opacity-40">⇅</span>
                          ))}
                        {!pinned && header.column.getCanResize() && (
                          <div
                            role="separator"
                            aria-orientation="vertical"
                            aria-label={t("grid.resizeHint")}
                            aria-valuenow={header.column.getSize()}
                            aria-valuemin={60}
                            aria-valuemax={header.column.columnDef.maxSize ?? 800}
                            tabIndex={0}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              header.getResizeHandler()(e);
                            }}
                            onTouchStart={header.getResizeHandler()}
                            onKeyDown={(e) => {
                              const delta =
                                e.key === "ArrowRight"
                                  ? 8
                                  : e.key === "ArrowLeft"
                                    ? -8
                                    : 0;
                              if (!delta) return;
                              e.preventDefault();
                              table.setColumnSizing((prev) => ({
                                ...prev,
                                [header.column.id]: Math.max(
                                  60,
                                  header.column.getSize() + delta,
                                ),
                              }));
                            }}
                            title={t("grid.resizeHint")}
                            className="absolute end-0 top-0 h-full w-1.5 cursor-col-resize touch-none select-none border-r-2 border-transparent transition-colors hover:border-blue-400 focus:border-blue-400 focus:outline-none"
                          />
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody role="rowgroup" className="relative" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((virtualRow) => (
              <VirtualOrderRow
                key={rowModel[virtualRow.index].id}
                row={rowModel[virtualRow.index]}
                index={virtualRow.index}
                start={virtualRow.start}
                isActive={virtualRow.index === activeIndex}
                colVisibilityKey={colVisibilityKey}
                sizingKey={sizingKey}
                flexId={flexId}
                flexWidth={flexWidth}
                onKeyDown={handleRowKeyDown}
                onActivate={setActiveRow}
                rowElsRef={rowEls}
              />
            ))}
          </tbody>
        </table>
        {rowModel.length === 0 && (
          <div className="flex h-32 items-center justify-center text-sm text-slate-600 dark:text-slate-400">
            {t("grid.noResults")}
          </div>
        )}
        <span aria-live="polite" className="sr-only">
          {rowModel.length > 0
            ? `${t("grid.resultCount").replace("{n}", displayRows.length.toLocaleString())}. ${t("grid.rowOf")
                .replace("{n}", String(activeIndex + 1))
                .replace("{m}", String(rowModel.length))}`
            : `${t("grid.resultCount").replace("{n}", "0")}`}
          {liveTick}
        </span>
        {mode === "paged" && rowModel.length > 0 && (
          <div className="sticky bottom-0 flex items-center justify-center gap-2 border-t border-slate-100 bg-white/95 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/95">
            {pagingMore ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("grid.loadingMore")}
              </>
            ) : (
              t("grid.loadedOf")
                .replace("{n}", rowModel.length.toLocaleString())
                .replace("{m}", displayRows.length.toLocaleString())
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AggCard({
  label,
  value,
  sub,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100 dark:bg-slate-800/50 dark:ring-slate-800">
      <p className="text-xs text-slate-600 dark:text-slate-400">{label}</p>
      <p
        className={cn(
          "mt-0.5 truncate text-base font-bold text-slate-900 dark:text-slate-100",
          // Pulsing placeholder needs WCAG AA contrast against slate-50.
          // slate-600 on slate-50 ≈ 5.7:1 (clears 4.5:1); the pulse alone
          // signals the loading state, so the text must also be readable.
          loading && "animate-pulse text-slate-600 dark:text-slate-300",
        )}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 truncate text-[11px] text-slate-600 dark:text-slate-400">
          {sub}
        </p>
      )}
    </div>
  );
}



