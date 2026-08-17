"use client";

import { ChartPie, Menu } from "lucide-react";
import { useSettings } from "@/components/settings-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";

export function MobileTopBar({
  onOpenMenu,
  expanded,
  triggerRef,
}: {
  onOpenMenu: () => void;
  expanded: boolean;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const { t } = useSettings();

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/90">
      <button
        ref={triggerRef}
        type="button"
        onClick={onOpenMenu}
        aria-label={expanded ? t("aria.closeMenu") : t("aria.openMenu")}
        aria-haspopup="dialog"
        aria-expanded={expanded}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
          <ChartPie className="h-4 w-4" />
        </div>
        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
          {t("app.name")}
        </p>
      </div>
      <div className="ms-auto flex items-center gap-1">
        <ThemeToggle compact />
        <LanguageToggle compact />
      </div>
    </header>
  );
}
