import { useEffect, useMemo, useState } from "react";
import { createElement } from "react";
import { Search, ReceiptText, Plus } from "lucide-react";
import { db, bus } from "@offlinepos/core/browser";
import type { Order, OrderStatus } from "@offlinepos/core/types";
import { cn, formatMoney } from "../lib/utils";
import { useI18n } from "../i18n";
import type { MessageKey } from "../i18n/messages";
import { paymentMethodIcon } from "../lib/payments";
import { OrderDetailView } from "./OrderDetail";
import { StatusChip } from "./StatusChip";

const STATUSES: OrderStatus[] = ["pending", "synced", "failed"];

const STATUS_TITLES: Record<OrderStatus, MessageKey> = {
  pending: "statusPending",
  synced: "statusSynced",
  failed: "statusFailed",
};

/**
 * The orders list as its own page (reached from the sidebar / bottom tabs).
 * Master-detail: the list on the left, the live order in a detail modal.
 * Editing an order hands off to the cart panel via `onEditOrder`.
 */
export function OrdersPage({
  onEditOrder,
  onNewSale,
  detailOrderId,
  onDetailClose,
}: {
  onEditOrder: (order: Order) => void;
  onNewSale: () => void;
  detailOrderId?: string | null;
  onDetailClose?: () => void;
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [selected, setSelected] = useState<Order | null>(null);
  const { t, locale } = useI18n();

  useEffect(() => {
    const refresh = () =>
      setOrders([...db.getOrders()].sort((a, b) => b.createdAt - a.createdAt));
    refresh();
    const offDb = bus.on("db:changed", (payload) => {
      if (payload.table === "orders") refresh();
    });
    const offSynced = bus.on("order:synced", refresh);
    return () => {
      offDb();
      offSynced();
    };
  }, []);

  const query = search.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      orders.filter((order) => {
        if (filter !== "all" && order.status !== filter) return false;
        if (!query) return true;
        if (order.handle.toLowerCase().includes(query)) return true;
        if (order.status.toLowerCase().includes(query)) return true;
        return order.lines.some((line) =>
          line.name.toLowerCase().includes(query),
        );
      }),
    [orders, filter, query],
  );

  const counts = useMemo(() => {
    const c: Record<OrderStatus | "all", number> = {
      all: orders.length,
      pending: 0,
      synced: 0,
      failed: 0,
    };
    for (const order of orders) c[order.status]++;
    return c;
  }, [orders]);

  // App-driven entry (e.g. right after an edit save) takes precedence over a
  // locally tapped row, so the modal opens on the order we were asked to show.
  const activeOrder = useMemo(() => {
    if (detailOrderId) {
      return (
        db.findOrder(detailOrderId) ??
        orders.find((order) => order.id === detailOrderId) ??
        null
      );
    }
    return selected;
  }, [detailOrderId, selected, orders]);

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col gap-4">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <ReceiptText className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <h1 className="text-base font-bold text-primary">{t("orders")}</h1>
            <p className="text-xs text-faint-strong">
              {t("orderCount", { n: counts.all })}
            </p>
          </div>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              type="search"
              name="order-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("ordersSearch")}
              aria-label={t("ordersSearch")}
              className="w-full rounded-xl border-0 bg-surface py-2 ps-9 pe-3 text-sm text-primary ring-1 ring-line placeholder:text-faint focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <button
            type="button"
            onClick={onNewSale}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-b from-brand to-brand-dark px-3.5 py-2 text-sm font-bold text-white shadow-sm transition-all hover:from-brand-dark hover:to-brand-dark active:scale-[0.99]"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("newSale")}</span>
          </button>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label={t("allOrders")}
          count={counts.all}
        />
        {STATUSES.map((status) => (
          <FilterChip
            key={status}
            active={filter === status}
            onClick={() => setFilter(status)}
            label={t(STATUS_TITLES[status])}
            count={counts[status]}
          />
        ))}
      </div>

      {/* Order list */}
      <div className="min-h-0 flex-1 overflow-y-auto pb-6 ps-2 pr-1 pt-2">
        {orders.length === 0 ? (
          <EmptyState
            icon={<ReceiptText className="h-6 w-6" />}
            title={t("noOrders")}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Search className="h-6 w-6" />}
            title={t("noOrdersMatch", { q: search })}
          />
        ) : (
          <ul className="space-y-2">
            {filtered.map((order) => (
              <li key={order.id}>
                <button
                  type="button"
                  onClick={() => setSelected(order)}
                  className="group flex w-full cursor-pointer items-center gap-3 rounded-xl bg-surface px-5 py-4 text-start ring-1 ring-line transition-colors hover:bg-elevated hover:ring-line-strong"
                >
                  <PaymentIcon method={order.paymentMethod} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-primary">
                        {order.handle}
                      </span>
                      <StatusChip status={order.status} />
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2 text-xs text-faint-strong">
                      <span>
                        {new Date(order.createdAt).toLocaleString(
                          locale === "ar" ? "ar-SA" : "en-US",
                        )}{" "}
                        ·{" "}
                        {t("items", {
                          n: order.lines.reduce((n, l) => n + l.quantity, 0),
                        })}
                      </span>
                      <span className="tabular font-bold text-primary">
                        {formatMoney(order.total)}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Detail modal — edit hands off to the cart via onEditOrder */}
      {activeOrder && (
        <OrderDetailView
          order={activeOrder}
          onClose={() => {
            setSelected(null);
            onDetailClose?.();
          }}
          onEdit={() => onEditOrder(activeOrder)}
        />
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors active:scale-[0.98]",
        active
          ? "bg-brand-light text-brand ring-brand/30"
          : "bg-surface text-secondary ring-line hover:bg-sunken",
      )}
    >
      {label}
      <span
        className={cn(
          "tabular rounded-full px-1.5 py-0.5 text-[10px] font-bold",
          active ? "bg-brand text-white" : "bg-sunken text-faint-strong",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function PaymentIcon({ method }: { method: string }) {
  return createElement(paymentMethodIcon(method), {
    className: "h-4 w-4 shrink-0 text-faint-strong",
  });
}

function EmptyState({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-faint ring-1 ring-line">
        {icon}
      </div>
      <p className="text-sm font-medium text-secondary">{title}</p>
    </div>
  );
}
