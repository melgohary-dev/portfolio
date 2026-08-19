"use client";

import { Languages } from "lucide-react";
import { useSettings } from "@/components/settings-provider";
import { cn } from "@/lib/utils";

export function LanguageToggle({
  compact = false,
  className,
  showTooltip = true,
  tipPlacement = "side",
}: {
  compact?: boolean;
  className?: string;
  showTooltip?: boolean;
  tipPlacement?: "side" | "above" | "below";
}) {
  const { locale, setLocale, t } = useSettings();
  const next = locale === "en" ? "ar" : "en";
  const nextLabel = next === "ar" ? "العربية" : "English";

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      aria-label={t("aria.language")}
      title={nextLabel}
      data-tip={showTooltip ? nextLabel : undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
        showTooltip && "tip",
        showTooltip && tipPlacement === "above" && "tip-above",
        showTooltip && tipPlacement === "below" && "tip-below",
        compact ? "h-9 w-9" : "gap-2 px-2.5 py-2",
        className,
      )}
    >
      <Languages className="h-4 w-4" />
      {!compact && <span className="text-xs font-medium">{nextLabel}</span>}
    </button>
  );
}
