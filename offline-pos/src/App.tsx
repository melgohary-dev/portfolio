import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { ShoppingCart, PauseCircle } from "lucide-react";
import {
  AppSidebar,
  MobileTopBar,
  MobileTabs,
  type View,
} from "./components/Sidebar";
import { ProductCatalog } from "./components/ProductCatalog";
import { CartPanel } from "./components/CartPanel";
import { OrdersPage } from "./components/OrdersPage";
import { PwaBanner } from "./components/PwaBanner";
import { useSyncLifecycle } from "./hooks/useSyncLifecycle";
import { usePrinterBridge } from "./hooks/usePrinterBridge";
import { useDocumentSettings } from "./hooks/useDocumentSettings";
import { useDialogFocus } from "./hooks/useDialogFocus";
import { useCartStore } from "./store/cart";
import { db } from "@offlinepos/core/browser";
import { computePricing } from "@offlinepos/core";
import { formatMoney } from "./lib/utils";
import { t, useI18n } from "./i18n";
import type { Order } from "@offlinepos/core/types";

/**
 * App shell: a persistent sidebar (desktop) or bottom tabs (mobile) switch
 * between two views — the till ("pos") and the orders page. Editing an order
 * loads it into the cart and returns to the till; cancelling the edit goes
 * back to the orders list.
 */
export default function App() {
  useSyncLifecycle();
  usePrinterBridge();
  useDocumentSettings();
  const [view, setView] = useState<View>(() => viewFromPath(window.location.pathname));
  const [cartOpen, setCartOpen] = useState(false);
  const [ordersDetailId, setOrdersDetailId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    () => localStorage.getItem("offlinepos:sidebar-collapsed") === "1",
  );
  // The mobile cart sheet gets focus management and the Tab trap from the
  // shared hook, but its Escape stays CartPanel-owned (it walks back through
  // parking / review first), so onEscape is deliberately disabled here.
  const cartSheetRef = useDialogFocus<HTMLDivElement>(
    cartOpen,
    () => setCartOpen(false),
    null,
  );

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("offlinepos:sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }, []);

  // Runs a state update inside a View Transition so both the outgoing and the
  // incoming view animate (falling back to a plain update in older browsers).
  const navigate = useCallback((update: () => void) => {
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => void;
    };
    if (doc.startViewTransition) {
      doc.startViewTransition(() => flushSync(update));
    } else {
      update();
    }
  }, []);

  // Keep the URL in sync with the active view and honour browser back/forward.
  useEffect(() => {
    const onPopState = () => {
      const next = viewFromPath(window.location.pathname);
      navigate(() => {
        if (next === "pos") setOrdersDetailId(null);
        setView(next);
      });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [navigate]);

  const goTo = useCallback(
    (next: View) => {
      navigate(() => {
        if (next === "pos") setOrdersDetailId(null);
        setView(next);
      });
      const path = pathFor(next);
      if (window.location.pathname !== path) {
        window.history.pushState(null, "", path);
      }
    },
    [navigate],
  );

  const handleStartEdit = useCallback((order: Order) => {
    const store = useCartStore.getState();
    // A stale in-progress edit would block startEditOrder — drop it first.
    if (store.editSession) store.cancelEdit();
    store.startEditOrder(db.findOrder(order.id) ?? order);
    goTo("pos");
    // On mobile the cart is a sheet — open it so the edit banner is visible.
    if (window.matchMedia("(max-width: 1023px)").matches) setCartOpen(true);
  }, [goTo]);

  const handleCancelEdit = useCallback(() => {
    setCartOpen(false);
    goTo("orders");
  }, [goTo]);

  // Fired by the cart panel once the receipt of a saved edit is dismissed —
  // return the cashier to that order's details.
  const handleEditSaved = useCallback((orderId: string) => {
    setOrdersDetailId(orderId);
    goTo("orders");
  }, [goTo]);

  return (
    <div className="flex h-full bg-blueprint">
      <AppSidebar
        view={view}
        onNavigate={goTo}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      <main className="flex min-w-0 flex-1 flex-col animate-app-enter">
        <MobileTopBar />

        <div className="flex min-h-0 flex-1">
          {view === "pos" ? (
            <>
              <section className="min-w-0 flex-1 overflow-hidden px-4 pb-24 pt-4 lg:px-6 lg:pb-4 lg:pt-5">
                <ProductCatalog />
              </section>
              <aside className="hidden w-[400px] shrink-0 overflow-hidden border-l border-line bg-surface lg:block">
                <CartPanel
                  onCancelEdit={handleCancelEdit}
                  onEditSaved={handleEditSaved}
                />
              </aside>
            </>
          ) : (
            <section className="min-w-0 flex-1 overflow-hidden px-4 pb-24 pt-4 lg:px-6 lg:pb-4 lg:pt-5">
              <OrdersPage
                detailOrderId={ordersDetailId}
                onDetailClose={() => setOrdersDetailId(null)}
                onEditOrder={handleStartEdit}
                onNewSale={() => goTo("pos")}
              />
            </section>
          )}
        </div>
      </main>

      {/* Mobile: floating summary bar that opens the cart as a bottom sheet. */}
      {view === "pos" && <MobileCartBar onOpen={() => setCartOpen(true)} />}

      {cartOpen && (
        <div
          ref={cartSheetRef}
          tabIndex={-1}
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={t("cart")}
        >
          <div
            className="absolute inset-0 animate-pos-fade-in bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setCartOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 top-6 flex animate-pos-slide-up flex-col rounded-t-3xl bg-surface shadow-2xl">
            <CartPanel
              onClose={() => setCartOpen(false)}
              onCancelEdit={handleCancelEdit}
              onEditSaved={handleEditSaved}
            />
          </div>
        </div>
      )}

      <MobileTabs view={view} onNavigate={goTo} />

      {/* PWA install + update lifecycle (service worker is owned by the hook). */}
      <PwaBanner />
    </div>
  );
}

/**
 * Sticky bottom bar shown only on small screens (the desktop cart column is
 * always visible on lg+). Shows a live total + item count and is the only
 * mobile entry point into the cart sheet. Sits above the bottom tab bar.
 */
function MobileCartBar({ onOpen }: { onOpen: () => void }) {
  const lines = useCartStore((state) => state.lines);
  const parked = useCartStore((state) => state.parked);
  const discount = useCartStore((state) => state.discount);
  const taxes = useCartStore((state) => state.taxes);
  const { t } = useI18n();

  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);
  const total = computePricing(lines, discount, taxes).total;
  const hasContent = lines.length > 0 || parked.length > 0;

  if (!hasContent) return null;

  const onlyParked = lines.length === 0 && parked.length > 0;

  return (
    <div className="fixed inset-x-0 bottom-14 z-30 border-t border-line bg-surface/95 p-3 shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden dark:shadow-[0_-8px_30px_rgba(0,0,0,0.5)]">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl bg-gradient-to-b from-brand to-brand-dark px-4 py-3 text-white shadow-md active:scale-[0.99]"
      >
        <span className="flex items-center gap-2.5 text-sm font-bold">
          {onlyParked ? (
            <PauseCircle className="h-5 w-5" />
          ) : (
            <span className="relative">
              <ShoppingCart className="h-5 w-5" />
              <span className="tabular absolute -end-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-bold text-amber-950 ring-1 ring-surface">
                {itemCount}
              </span>
            </span>
          )}
          {onlyParked
            ? t("parkedOrders", { n: parked.length })
            : t("reviewCart")}
        </span>
        <span className="flex items-center gap-2 text-sm font-bold">
          {!onlyParked && (
            <span className="tabular">{formatMoney(total)}</span>
          )}
          <span className="text-xl leading-none rtl:-scale-x-100">↑</span>
        </span>
      </button>
    </div>
  );
}

/** Map a URL path to the matching view (unknown paths fall back to the till). */
function viewFromPath(path: string): View {
  const clean = path.replace(/\/+$/, "").toLowerCase();
  return clean === "/orders" ? "orders" : "pos";
}

/** URL for a view — the till lives at "/" so the root stays the landing page. */
function pathFor(view: View): string {
  return view === "orders" ? "/orders" : "/";
}
