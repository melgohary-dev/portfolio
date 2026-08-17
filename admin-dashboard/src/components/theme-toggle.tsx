"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSettings } from "@/components/settings-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle({
  compact = false,
  className,
  showTooltip = true,
  tipPlacement = "side",
}: {
  compact?: boolean;
  className?: string;
  showTooltip?: boolean;
  tipPlacement?: "side" | "above";
}) {
  const { settings, setTheme, t } = useSettings();
  const Icon =
    settings.theme === "dark" ? Moon : settings.theme === "system" ? Monitor : Sun;
  const next =
    settings.theme === "light"
      ? "dark"
      : settings.theme === "dark"
        ? "system"
        : "light";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={t("aria.theme")}
      title={t("aria.theme")}
      data-tip={showTooltip ? t("aria.theme") : undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
        showTooltip && "tip",
        showTooltip && tipPlacement === "above" && "tip-above",
        compact ? "h-9 w-9" : "gap-2 px-2.5 py-2",
        className,
      )}
    >
      <Icon className="h-4 w-4" />
      {!compact && <span className="text-xs font-medium">{t("settings.themeLabel")}</span>}
    </button>
  );
}
