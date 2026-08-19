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
  type VisibilityState,
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
import { useOrdersAggregation } from "@/hooks/use-orders-aggregation";
import type { GridQuery, Outgoing } from "@/lib/orders-worker";
import { cn } from "@/lib/utils";
import { VirtualOrderRow } from "./virtual-order-row";
import { AggCard } from "./agg-card";
import { useFocusTrap } from "./use-focus-trap";
import {
  ALL,
  COLUMN_IDS,
  LAYOUT_KEY,
  LAYOUT_VERSION,
  PAGE_SIZE,
  PAGED_PAGE_SIZE,
  ROW_HEIGHT,
  VIEWPORT_HEIGHT,
  VIEWS_KEY,
  VIEWS_VERSION,
  type GridMode,
  type LayoutPrefs,
  type SavedView,
  coerceColumnState,
  isAllowedRegion,
  isAllowedStatus,
  matches,
  parseLayoutPrefs,
  parseSavedViews,
  sanitizeSorting,
} from "./grid-utils";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    pinned?: "left" | "right";
  }
}

import type { RowData } from "@tanstack/react-table";

const columnHelper = createColumnHelper<OrderRow>();

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
  const [containerWidth, setContainerWidth] = useState(0);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, OrderStatus>>({});

  const [views, setViews] = useState<SavedView[]>([]);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [selectedView, setSelectedView] = useState("");
  const [exporting, setExporting] = useState(false);

  const [mode, setMode] = useState<GridMode>("virtual");
  const [loadedPages, setLoadedPages] = useState(1);
  const [pagingMore, setPagingMore] = useState(false);

  const [activeIndex, setActiveIndex] = useState(0);
  const [liveTick, setLiveTick] = useState(0);
  const rowEls = useRef<Map<number, HTMLTableRowElement>>(new Map());
  const columnsButtonRef = useRef<HTMLButtonElement | null>(null);
  const viewsButtonRef = useRef<HTMLButtonElement | null>(null);

  const closeColumns = useCallback(() => setColumnsOpen(false), []);
  const closeViews = useCallback(() => setViewMenuOpen(false), []);
  const columnsMenuRef = useFocusTrap(columnsOpen, closeColumns, columnsButtonRef);
  const viewsMenuRef = useFocusTrap(viewMenuOpen, closeViews, viewsButtonRef);

  const rows = useMemo(() => getOrders(), []);

  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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

  const displayRows = useMemo(() => {
    const keys = Object.keys(statusOverrides);
    if (keys.length === 0) return filtered;
    return filtered.map((row) => {
      const next = statusOverrides[row.id];
      return next && next !== row.status ? { ...row, status: next } : row;
    });
  }, [filtered, statusOverrides]);

  useEffect(() => {
    setLiveTick((n) => n + 1);
  }, [displayRows.length]);

  const gridData = useMemo(
    () =>
      mode === "paged"
        ? displayRows.slice(0, loadedPages * PAGED_PAGE_SIZE)
        : displayRows,
    [mode, displayRows, loadedPages],
  );

  useEffect(() => {
    const id = setTimeout(() => {
      aggregate({ search: debouncedSearch, status, region, statusOverrides } satisfies GridQuery);
    }, 300);
    return () => clearTimeout(id);
  }, [rows, aggregate, debouncedSearch, status, region, statusOverrides]);

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

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (mode === "paged") {
      setLoadedPages(1);
      scrollRef.current?.scrollTo({ top: 0 });
    }
  }, [mode, debouncedSearch, status, region, sorting]);

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
          <span className="whitespace-nowrap text-slate-700 dark:text-slate-300">
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

  const flexCol = table
    .getAllLeafColumns()
    .find((c) => c.getIsVisible() && !c.getIsPinned());
  const flexId = flexCol?.id ?? null;
  const flexSize = flexCol?.getSize() ?? 0;
  const sumFixed = table.getTotalSize();
  const overflow = containerWidth > sumFixed ? containerWidth - sumFixed : 0;
  const flexWidth = flexCol ? flexSize + overflow : flexSize;
  const totalWidth = Math.max(sumFixed, containerWidth);

  const rowModel = table.getRowModel().rows;
  const getScrollElement = useCallback(() => scrollRef.current, []);
  const estimateSize = useCallback(() => ROW_HEIGHT, []);
  const virtualizer = useVirtualizer({
    count: rowModel.length,
    getScrollElement,
    estimateSize,
    overscan: 6,
  });

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
    if (!worker || exporting) return;
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

  const loadView = (viewName: string) => {
    const view = views.find((v) => v.name === viewName);
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
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <label className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
          <input
            ref={searchInputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`${t("grid.search")} (⌘K)`}
            className="w-full rounded-xl border-0 bg-white py-2 ps-9 pe-9 text-sm text-slate-900 shadow-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700 dark:placeholder:text-slate-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                searchInputRef.current?.focus();
              }}
              aria-label={t("grid.clearSearch")}
              className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            >
              ✕
            </button>
          )}
        </label>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus | typeof ALL)}
          aria-label={t("grid.statusAll")}
          className="rounded-xl border-0 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700"
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
          className="rounded-xl border-0 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700"
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
          className="inline-flex rounded-xl bg-white p-0.5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
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
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800"
          >
            <Columns3 className="h-4 w-4" />
            {t("grid.columns")}
          </button>
          {columnsOpen && (
            <div
              ref={columnsMenuRef}
              role="menu"
              className="absolute end-0 z-40 mt-2 w-64 rounded-xl bg-white p-3 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
            >
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
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
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800"
          >
            <Save className="h-4 w-4" />
            {t("grid.saveView")}
          </button>
          {viewMenuOpen && (
            <div
              ref={viewsMenuRef}
              role="menu"
              className="absolute end-0 z-40 mt-2 w-64 rounded-xl bg-white p-3 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
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
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                  {t("grid.savedViews")}
                </p>
                {views.length === 0 ? (
                  <p className="text-xs text-slate-600 dark:text-slate-300">{t("grid.noSavedViews")}</p>
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
                            loadView(view.name);
                          }}
                          className="shrink-0 cursor-pointer text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {t("grid.loadView")}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(t("grid.confirmDeleteView"))) {
                              setSelectedView(view.name);
                              deleteView();
                            }
                          }}
                          aria-label={t("grid.deleteView")}
                          className="shrink-0 cursor-pointer text-slate-600 hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400"
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

      <p className="shrink-0 text-sm text-slate-700 dark:text-slate-300">
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

      <div className="shrink-0 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <LayoutGrid className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            {t("grid.aggregate")}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                displayRows === rows
                  ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  : "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300",
              )}
            >
              {displayRows === rows
                ? t("grid.aggregateScope")
                : `${t("grid.aggregateScopeFiltered")} · ${displayRows.length.toLocaleString()}`}
            </span>
          </p>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
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
        <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
          {t("grid.aggregateHint")}
        </p>
      </div>

      <div
        ref={scrollRef}
        data-testid="grid-scroll"
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
        style={{ height: "min(560px, calc(100dvh - 280px))" }}
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
                        "sticky top-0 z-20 border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/95 dark:text-slate-300",
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
          <div className="flex h-32 items-center justify-center text-sm text-slate-600 dark:text-slate-300">
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
