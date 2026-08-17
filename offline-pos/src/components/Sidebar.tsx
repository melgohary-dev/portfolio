import { useEffect, useState } from "react";
import {
  Store,
  ReceiptText,
  Cloud,
  CloudOff,
  RefreshCw,
  Moon,
  Sun,
  Languages,
  ChevronLeft,
  ChevronRight,
  SquareStack,
  Printer,
} from "lucide-react";
import { useNetworkStore } from "../store/network";
import { useSyncStore } from "../store/sync";
import { useTabStore } from "../store/tab";
import { useThemeStore } from "../store/theme";
import { usePrinterStore } from "../store/printer";
import { useLocaleStore, useI18n } from "../i18n";
import { cn } from "../lib/utils";
import { PrinterCard } from "./PrinterCard";
import {
  printer as printerManager,
  MemoryReceiptPrinter,
  WebSerialReceiptPrinter,
} from "@offlinepos/core/browser";

export type View = "pos" | "orders";

/**
 * Desktop navigation rail (lg+). Brand, primary views, and a network/sync
 * status card with app settings. Mobile gets `MobileTopBar` + `MobileTabs`
 * instead so the layout stays touch-first.
 */
export function AppSidebar({
  view,
  onNavigate,
  collapsed,
  onToggleCollapse,
}: {
  view: View;
  onNavigate: (view: View) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const { t } = useI18n();

  return (
    <aside
      className={cn(
        "relative hidden h-full shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 ease-out lg:flex",
        collapsed ? "w-20" : "w-64",
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "relative flex items-center gap-3 border-b border-line py-4 transition-[padding] duration-200",
          collapsed ? "justify-center px-0" : "px-5 pe-8",
        )}
      >
        <img src="/logo.svg" alt="OfflinePOS" className="h-9 w-9 shrink-0" />
        {!collapsed && (
          <div className="leading-tight">
            <h1 className="text-sm font-bold text-primary">OfflinePOS</h1>
            <p className="text-[11px] text-faint-strong">{t("tagline")}</p>
          </div>
        )}

        {/* Collapse / expand control, pinned to the brand header edge */}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
          aria-expanded={!collapsed}
          title={collapsed ? t("expandSidebar") : t("collapseSidebar")}
          className="absolute -end-3 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-faint-strong shadow-md transition-colors hover:bg-sunken hover:text-primary active:scale-95"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5 rtl:-scale-x-100" />
          )}
        </button>
      </div>

      {/* Primary navigation */}
      <nav
        className={cn(
          "flex-1 space-y-1 py-4 transition-[padding] duration-200",
          collapsed ? "overflow-visible px-0" : "overflow-y-auto px-3",
        )}
      >
        <NavButton
          active={view === "pos"}
          onClick={() => onNavigate("pos")}
          icon={<Store className="h-4 w-4" />}
          label={t("pos")}
          collapsed={collapsed}
        />
        <NavButton
          active={view === "orders"}
          onClick={() => onNavigate("orders")}
          icon={<ReceiptText className="h-4 w-4" />}
          label={t("orders")}
          badge={useSyncStore((s) => s.pending)}
          collapsed={collapsed}
        />
      </nav>

      {/* Network / sync status */}
      <div className={cn("border-t border-line p-3", collapsed && "px-2")}>
        <NetworkCard collapsed={collapsed} />
        <div className="mt-3">
          <PrinterCard collapsed={collapsed} />
        </div>
        <div
          className={cn(
            "mt-3 flex items-center gap-2",
            collapsed ? "flex-col justify-center" : "justify-between",
          )}
        >
          <ThemeToggle collapsed={collapsed} />
          <LanguageToggle collapsed={collapsed} />
        </div>
      </div>
    </aside>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  label,
  badge,
  collapsed = false,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  collapsed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      data-tip={collapsed ? label : undefined}
      className={cn(
        "relative flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
        collapsed && "tip justify-center px-0",
        active
          ? "bg-brand-light text-brand"
          : "text-secondary hover:bg-sunken hover:text-primary",
      )}
    >
      <span className={cn(active ? "text-brand" : "text-faint-strong")}>
        {icon}
      </span>
      {!collapsed && <span className="flex-1 text-start">{label}</span>}
      {badge !== undefined && badge > 0 && (
        <span
          className={cn(
            "tabular flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white",
            collapsed ? "absolute end-1 top-1 h-4 min-w-4 text-[9px]" : "",
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function NetworkCard({ collapsed = false }: { collapsed?: boolean }) {
  const { t } = useI18n();
  const online = useNetworkStore((state) => state.online);
  const toggle = useNetworkStore((state) => state.toggle);
  const pending = useSyncStore((state) => state.pending);
  const dead = useSyncStore((state) => state.dead);
  const syncing = useSyncStore((state) => state.syncing);
  const tabsLive = useTabStore((state) => state.tabsLive);
  const lastRemoteAt = useTabStore((state) => state.lastRemoteAt);
  const [now, setNow] = useState(() => Date.now());

  // The "updated just now / updated Xs ago" label only moves while the last
  // remote event is fresh, so the 1s tick runs only for that window and stops
  // once the label goes static (nothing re-renders the countdown anymore).
  useEffect(() => {
    if (lastRemoteAt === null) return;
    const id = window.setInterval(() => {
      const ticked = Date.now();
      setNow(ticked);
      if (ticked - lastRemoteAt > 60_000) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [lastRemoteAt]);

  const remoteLabel =
    lastRemoteAt === null
      ? null
      : lastRemoteAt > now - 2000
        ? t("updatedNow")
        : t("updatedAgo", { time: timeAgo(lastRemoteAt, now) });

  if (collapsed) {
    const status = `${online ? t("online") : t("offline")} · ${t("pending", { n: pending })}${dead > 0 ? ` · ${t("dead", { n: dead })}` : ""}${tabsLive > 1 ? ` · ${t("tabsLive", { n: tabsLive })}` : ""}`;
    return (
      <button
        type="button"
        onClick={toggle}
        title={status}
        data-tip={status}
        className={cn(
          "tip relative flex w-full cursor-pointer items-center justify-center rounded-xl p-2.5 ring-1 transition-colors active:scale-[0.99]",
          online
            ? "bg-emerald-50 ring-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:ring-emerald-900 dark:hover:bg-emerald-950/60"
            : "bg-amber-50 ring-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:ring-amber-900 dark:hover:bg-amber-950/60",
        )}
      >
        {syncing ? (
          <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-brand" />
        ) : online ? (
          <Cloud className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <CloudOff className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        )}
        {pending > 0 && (
          <span className="tabular absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white">
            {pending}
          </span>
        )}
        {tabsLive > 1 && (
          <span
            title={remoteLabel ?? undefined}
            data-tip={remoteLabel ?? undefined}
            className="tabular tip absolute -start-1 -bottom-1 flex h-4 min-w-4 items-center justify-center gap-0.5 rounded-full bg-brand px-1 text-[9px] font-bold text-white"
          >
            <SquareStack className="h-2.5 w-2.5" />
            {tabsLive}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={online ? t("goOffline") : t("goOnline")}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-start ring-1 transition-colors active:scale-[0.99]",
        online
          ? "bg-emerald-50 ring-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:ring-emerald-900 dark:hover:bg-emerald-950/60"
          : "bg-amber-50 ring-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:ring-amber-900 dark:hover:bg-amber-950/60",
      )}
    >
      {syncing ? (
        <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-brand" />
      ) : online ? (
        <Cloud className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <CloudOff className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      )}
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block text-xs font-bold text-primary">
          {syncing ? t("syncing") : online ? t("online") : t("offline")}
        </span>
        <span className="block truncate text-[11px] text-faint-strong">
          {t("pending", { n: pending })}
          {dead > 0 && ` · ${t("dead", { n: dead })}`}
        </span>
        <span
          className={cn(
            "flex items-center gap-1 text-[11px]",
            remoteLabel ? "text-faint-strong" : "text-faint",
          )}
        >
          <SquareStack className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {t("tabsLive", { n: tabsLive })}
            {remoteLabel && ` · ${remoteLabel}`}
          </span>
        </span>
      </span>
    </button>
  );
}

function timeAgo(at: number, now: number): string {
  const s = Math.max(0, Math.floor((now - at) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { t } = useI18n();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={t("theme")}
      title={t("theme")}
      data-tip={collapsed ? t("theme") : undefined}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center rounded-xl bg-elevated p-2 text-secondary ring-1 ring-line transition-colors hover:bg-sunken active:scale-[0.98]",
        collapsed && "tip w-full",
      )}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function LanguageToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { t } = useI18n();
  const locale = useLocaleStore((s) => s.locale);
  const toggleLocale = useLocaleStore((s) => s.toggleLocale);
  return (
    <button
      type="button"
      onClick={toggleLocale}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-elevated px-2.5 py-2 text-xs font-bold text-secondary ring-1 ring-line transition-colors hover:bg-sunken active:scale-[0.98]",
        collapsed && "tip w-full justify-center px-0",
      )}
      aria-label={t("language")}
      title={t("language")}
      data-tip={collapsed ? t("language") : undefined}
    >
      <Languages className="h-3.5 w-3.5" />
      {!collapsed && (locale === "en" ? "ع" : "EN")}
    </button>
  );
}

/**
 * Slim mobile top bar: brand, quick online toggle and app settings. The
 * primary navigation lives in the bottom `MobileTabs` bar.
 */
export function MobileTopBar() {
  const { t } = useI18n();
  const online = useNetworkStore((state) => state.online);
  const toggle = useNetworkStore((state) => state.toggle);
  const syncing = useSyncStore((s) => s.syncing);
  const printerState = usePrinterStore((s) => s.state);

  const togglePrinter = async () => {
    if (printerState === "ready") {
      await printerManager.disconnect();
    } else {
      if ("serial" in navigator && printerManager.printer instanceof MemoryReceiptPrinter) {
        printerManager.setPrinter(new WebSerialReceiptPrinter());
      }
      const result = await printerManager.connect();
      if (!result.ok) {
        printerManager.setPrinter(new MemoryReceiptPrinter());
        await printerManager.connect();
      }
    }
  };

  return (
    <header className="flex h-12 items-center justify-between border-b border-line bg-surface px-4 lg:hidden">
      <div className="flex items-center gap-2">
        <img src="/logo.svg" alt="OfflinePOS" className="h-6 w-6" />
        <span className="text-sm font-bold text-primary">OfflinePOS</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={togglePrinter}
          aria-label={printerState === "ready" ? t("printerDisconnect") : t("printerConnect")}
          title={printerState === "ready" ? t("printerDisconnect") : t("printerConnect")}
          className={cn(
            "inline-flex cursor-pointer items-center justify-center rounded-xl p-2 ring-1 transition-colors active:scale-[0.98]",
            printerState === "ready"
              ? "bg-sky-50 text-sky-600 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:ring-sky-900"
              : printerState === "error"
                ? "bg-red-50 text-red-600 ring-red-200 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-900"
                : "bg-elevated text-faint-strong ring-line",
          )}
        >
          <Printer className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-label={online ? t("goOffline") : t("goOnline")}
          title={online ? t("goOffline") : t("goOnline")}
          className={cn(
            "inline-flex cursor-pointer items-center justify-center rounded-xl p-2 ring-1 transition-colors active:scale-[0.98]",
            syncing
              ? "bg-elevated text-brand ring-line"
              : online
                ? "bg-emerald-50 text-emerald-600 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-900"
                : "bg-amber-50 text-amber-600 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-900",
          )}
        >
          {syncing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : online ? (
            <Cloud className="h-4 w-4" />
          ) : (
            <CloudOff className="h-4 w-4" />
          )}
        </button>
        <ThemeToggle />
        <LanguageToggle />
      </div>
    </header>
  );
}

/**
 * Mobile bottom navigation (lg+ hides it in favor of the sidebar). Mirrors the
 * same two primary views so the cashier can jump between the till and orders.
 */
export function MobileTabs({
  view,
  onNavigate,
}: {
  view: View;
  onNavigate: (view: View) => void;
}) {
  const { t } = useI18n();
  const pending = useSyncStore((s) => s.pending);

  const tabs = [
    {
      id: "pos" as View,
      icon: <Store className="h-5 w-5" />,
      label: t("pos"),
      badge: 0,
    },
    {
      id: "orders" as View,
      icon: <ReceiptText className="h-5 w-5" />,
      label: t("orders"),
      badge: pending,
    },
  ];

  return (
    <nav
      aria-label={t("primaryNav")}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
    >
      <div className="grid grid-cols-2">
        {tabs.map((tab) => {
          const active = view === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex cursor-pointer flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition-colors",
                active ? "text-brand" : "text-faint-strong hover:text-secondary",
              )}
            >
              <span className="relative">
                {tab.icon}
                {tab.badge > 0 && (
                  <span className="tabular absolute -end-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white ring-2 ring-surface">
                    {tab.badge}
                  </span>
                )}
              </span>
              {tab.label}
              <span
                className={cn(
                  "absolute inset-x-4 top-0 h-0.5 rounded-full transition-colors",
                  active ? "bg-brand" : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
