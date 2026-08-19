"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "next-view-transitions";
import { usePathname } from "next/navigation";
import {
  ChartPie,
  LayoutDashboard,
  Settings,
  ShoppingCart,
  Users,
} from "lucide-react";
import { useSettings } from "@/components/settings-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { cn } from "@/lib/utils";
import type { Messages, NestedKeyOf } from "@/lib/i18n";

const NAV: {
  href: string;
  labelKey: NestedKeyOf<Messages>;
  icon: typeof LayoutDashboard;
}[] = [
  { href: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/users", labelKey: "nav.users", icon: Users },
  { href: "/orders", labelKey: "nav.orders", icon: ShoppingCart },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

export function Sidebar({
  mobileOpen,
  onCloseMobile,
  restoreRef,
}: {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  restoreRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const { settings, t } = useSettings();
  const pathname = usePathname();
  const collapsed = settings.sidebarCollapsed;
  // Collapse only means anything on desktop — the mobile drawer always renders
  // expanded, whatever the persisted preference.
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const rail = collapsed && isDesktop;

  const hiddenTransform =
    settings.locale === "ar"
      ? "max-lg:translate-x-full"
      : "max-lg:-translate-x-full";

  // On mobile the drawer is a modal dialog: focus moves into it on open and is
  // returned to the hamburger trigger on close (Escape is handled by AppShell).
  const asideRef = useRef<HTMLElement | null>(null);
  const dialogMode = mobileOpen && !isDesktop;
  useEffect(() => {
    if (dialogMode) {
      asideRef.current?.focus();
    } else if (!mobileOpen) {
      restoreRef?.current?.focus();
    }
  }, [dialogMode, mobileOpen, restoreRef]);

  return (
    <aside
      ref={asideRef}
      role={dialogMode ? "dialog" : undefined}
      aria-modal={dialogMode ? "true" : undefined}
      aria-label={dialogMode ? t("aria.mobileNav") : undefined}
      tabIndex={dialogMode ? -1 : undefined}
      className={cn(
        "fixed inset-y-0 start-0 z-50 flex h-screen w-60 shrink-0 flex-col border-e border-slate-200 bg-white transition-[transform,width] duration-200 lg:translate-x-0 dark:border-slate-800 dark:bg-slate-900 focus:outline-none",
        collapsed && "lg:w-20",
        mobileOpen ? "max-lg:translate-x-0" : hiddenTransform,
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center gap-2.5 border-b border-slate-100 px-5 dark:border-slate-800",
          collapsed && "lg:justify-center lg:px-0",
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
          <ChartPie className="h-5 w-5" />
        </div>
        {!rail && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
              {t("app.name")}
            </p>
            <p className="truncate text-[11px] text-slate-600 dark:text-slate-400">
              {t("app.tagline")}
            </p>
          </div>
        )}
      </div>

      <nav
        className={cn(
          "flex-1 overflow-y-auto px-3 py-4",
          collapsed && "lg:overflow-visible lg:px-2",
        )}
        aria-label={t("nav.main")}
      >
        <ul className="space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onCloseMobile}
                  aria-current={active ? "page" : undefined}
                  aria-label={rail ? t(item.labelKey) : undefined}
                  data-tip={rail ? t(item.labelKey) : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    rail && "lg:tip lg:justify-center lg:px-0 lg:py-2.5",
                    active
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!rail && <span>{t(item.labelKey)}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div
        className={cn(
          "space-y-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800",
          collapsed && "lg:flex lg:flex-col lg:items-center lg:gap-3 lg:space-y-0 lg:px-2 lg:py-4",
        )}
      >
        {rail ? (
          <>
            <ThemeToggle compact tipPlacement="above" />
            <LanguageToggle compact tipPlacement="above" />
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <ThemeToggle showTooltip={false} />
              <LanguageToggle showTooltip={false} />
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              {t("app.demo")}
            </p>
          </>
        )}
      </div>
    </aside>
  );
}
