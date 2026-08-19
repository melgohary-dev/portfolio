"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSettings } from "@/components/settings-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";

/**
 * Desktop-only top bar (mobile has its own). Hosts the sidebar collapse
 * toggle — the collapsed/expanded state is visible right here, next to the
 * theme and language controls.
 */
export function DesktopTopBar() {
  const { settings, toggleSidebar, t } = useSettings();
  const collapsed = settings.sidebarCollapsed;

  return (
    <header className="sticky top-0 z-30 hidden items-center gap-2 border-b border-slate-200 bg-white/90 px-6 py-2.5 backdrop-blur lg:flex dark:border-slate-800 dark:bg-slate-900/90">
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={collapsed ? t("aria.expandSidebar") : t("aria.collapseSidebar")}
        aria-expanded={!collapsed}
        title={collapsed ? t("aria.expandSidebar") : t("aria.collapseSidebar")}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        {collapsed ? (
          <PanelLeftOpen className="h-5 w-5 rtl:rotate-180" />
        ) : (
          <PanelLeftClose className="h-5 w-5 rtl:rotate-180" />
        )}
      </button>

      <span className="h-6 w-px bg-slate-200 dark:bg-slate-800" aria-hidden="true" />

      <div className="ms-auto flex items-center gap-1">
        <ThemeToggle compact tipPlacement="below" />
        <LanguageToggle compact tipPlacement="below" />
      </div>
    </header>
  );
}
