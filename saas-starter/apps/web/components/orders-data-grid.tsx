'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Order } from '@saas/shared';
import { useI18n } from '@/components/i18n-provider';
import { formatMoney, formatDateTime, formatNumber } from '@/lib/format';

const columnHelper = createColumnHelper<Order>();
const ROW_HEIGHT = 44;
const VIEWPORT_HEIGHT = 600;
const PAGE_SIZE = 200;

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  paid: 'bg-green-50 text-green-700',
  refunded: 'bg-gray-100 text-gray-600',
  failed: 'bg-red-50 text-red-700',
};

type StatusFilter = 'all' | Order['status'];

export function OrdersDataGrid({
  initialOrders,
  initialTotal,
}: {
  initialOrders: Order[];
  initialTotal: number;
}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [total, setTotal] = useState(initialTotal);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t, locale } = useI18n();
  const tRef = useRef(t);
  tRef.current = t;
  const toastTimerRef = useRef<number | null>(null);
  const loadMoreInFlight = useRef(false);
  const changeStatusInFlight = useRef(false);

  async function fetchPage(offset: number, currentStatus: StatusFilter) {
    setLoading(true);
    try {
      const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (currentStatus !== 'all') {
        query.set('status', currentStatus);
      }
      const res = await fetch(`/api/orders?${query}`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Failed to load orders');
      }
      return (await res.json()) as { orders: Order[]; total: number };
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(next: StatusFilter) {
    if (changeStatusInFlight.current) return;
    changeStatusInFlight.current = true;
    try {
      setStatus(next);
      const data = await fetchPage(0, next);
      setOrders(data.orders);
      setTotal(data.total);
    } finally {
      changeStatusInFlight.current = false;
    }
  }

  async function loadMore() {
    if (loadMoreInFlight.current || search.trim()) return;
    loadMoreInFlight.current = true;
    try {
      const data = await fetchPage(orders.length, status);
      setOrders((prev) => {
        const seen = new Set(prev.map((o) => o.id));
        return [...prev, ...data.orders.filter((o) => !seen.has(o.id))];
      });
      setTotal(data.total);
    } finally {
      loadMoreInFlight.current = false;
    }
  }

  useEffect(() => {
    const es = new EventSource('/api/orders/stream');
    es.addEventListener('order.created', (e) => {
      const event = e as MessageEvent;
      const order = JSON.parse(event.data) as Order;
      setOrders((prev) =>
        prev.some((o) => o.id === order.id) ? prev : [order, ...prev],
      );
      setTotal((totalCount) => totalCount + 1);
      setToast(tRef.current('grid.newOrder', { name: order.customerName }));
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = window.setTimeout(() => setToast(null), 4000);
    });
    return () => {
      es.close();
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return orders;
    }
    return orders.filter(
      (o) =>
        o.customerName.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q),
    );
  }, [orders, search]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('id', {
        header: t('grid.id'),
        size: 180,
        cell: (info) => <span className="font-mono text-xs text-gray-600">{info.getValue()}</span>,
      }),
      columnHelper.accessor('customerName', {
        header: t('grid.customer'),
        size: 220,
        cell: (info) => <span className="font-medium text-gray-800">{info.getValue()}</span>,
      }),
      columnHelper.accessor('customerEmail', {
        header: t('grid.email'),
        size: 260,
        cell: (info) => <span className="text-gray-600">{info.getValue()}</span>,
      }),
      columnHelper.accessor('status', {
        header: t('grid.status'),
        size: 120,
        cell: (info) => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
              statusStyles[info.getValue()] ?? 'bg-gray-100 text-gray-600'
            }`}
          >
            {t(`status.${info.getValue()}`)}
          </span>
        ),
      }),
      columnHelper.accessor('createdAt', {
        header: t('grid.created'),
        size: 180,
        cell: (info) => (
          <span className="text-gray-600">{formatDateTime(info.getValue(), locale)}</span>
        ),
      }),
      columnHelper.accessor('amountCents', {
        header: t('grid.total'),
        size: 120,
        cell: (info) => (
          <span className="font-semibold tabular-nums text-gray-800">
            {formatMoney(info.getValue(), locale)}
          </span>
        ),
      }),
    ],
    [t, locale],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  function sanitizeCsvCell(value: string): string {
    const sanitized = value.replace(/"/g, '""');
    if (/^[=+\-@\t\r]/.test(sanitized)) {
      return `"${sanitized}"`;
    }
    return `"${sanitized}"`;
  }

  function exportCsv() {
    const header = ['id', 'customer', 'email', 'status', 'createdAt', 'amountCents'];
    const lines = [
      header.join(','),
      ...filtered.map((o) =>
        [
          sanitizeCsvCell(o.id),
          sanitizeCsvCell(o.customerName),
          sanitizeCsvCell(o.customerEmail),
          sanitizeCsvCell(o.status),
          sanitizeCsvCell(o.createdAt),
          sanitizeCsvCell(String(o.amountCents)),
        ].join(','),
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="order-search" className="sr-only">
          {t('grid.search')}
        </label>
        <input
          id="order-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('grid.search')}
          className="w-72 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
        />
        <label htmlFor="order-status" className="sr-only">
          {t('grid.allStatuses')}
        </label>
        <select
          id="order-status"
          value={status}
          onChange={(e) => changeStatus(e.target.value as StatusFilter)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-gray-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
        >
          <option value="all">{t('grid.allStatuses')}</option>
          <option value="pending">{t('status.pending')}</option>
          <option value="paid">{t('status.paid')}</option>
          <option value="refunded">{t('status.refunded')}</option>
          <option value="failed">{t('status.failed')}</option>
        </select>
        <button
          onClick={exportCsv}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
        >
          {t('grid.exportCsv')}
        </button>
        <span className="text-sm text-gray-600">
          {t('grid.count', { n: formatNumber(filtered.length, locale), m: formatNumber(total, locale) })}
        </span>
        {loading ? (
          <span className="text-xs text-gray-500">{t('grid.loading')}</span>
        ) : null}
      </div>

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800"
        >
          {toast}
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className="overflow-auto rounded-lg border"
        style={{ height: VIEWPORT_HEIGHT }}
        aria-busy={loading}
      >
        <table
          className="w-full border-separate border-spacing-0 text-sm"
          style={{ tableLayout: 'fixed' }}
          aria-label={t('grid.count', { n: formatNumber(filtered.length, locale), m: formatNumber(total, locale) })}
        >
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              {table.getFlatHeaders().map((header) => {
                const sorted = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className="border-b border-gray-200 px-4 py-2 text-start text-xs font-semibold uppercase tracking-wide text-gray-500"
                    aria-sort={
                      sorted === 'asc'
                        ? 'ascending'
                        : sorted === 'desc'
                          ? 'descending'
                          : 'none'
                    }
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        className="flex items-center gap-1 uppercase tracking-wide hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span className="sr-only">
                          {sorted === 'asc'
                            ? t('grid.sortAscending')
                            : sorted === 'desc'
                              ? t('grid.sortDescending')
                              : t('grid.sortNone')}
                        </span>
                        {{
                          asc: '▲',
                          desc: '▼',
                        }[sorted as string] ?? '⇅'}
                      </button>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="relative" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              if (!row) {
                return null;
              }
              return (
                <tr
                  key={row.id}
                  className="absolute inset-x-0 top-0 hover:bg-gray-50"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                  aria-rowindex={virtualRow.index + 2}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      style={{ width: cell.column.getSize(), height: ROW_HEIGHT }}
                      className="border-b border-gray-100 px-4 py-0 text-gray-600"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        onClick={loadMore}
        disabled={loading || orders.length >= total || !!search.trim()}
        className="rounded-md border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
      >
        {t('grid.loadMore')}
      </button>
    </div>
  );
}
