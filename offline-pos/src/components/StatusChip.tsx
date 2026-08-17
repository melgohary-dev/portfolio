import { AlertCircle, Cloud, CloudOff } from "lucide-react";
import type { Order } from "@offlinepos/core/types";
import { useI18n } from "../i18n";

/**
 * Shared order-status pill used by the orders list and the order detail modal.
 * The failed chip carries a tooltip because "failed" means the sale exists
 * locally but never reached the server — the cashier can retry or discard it.
 */
export function StatusChip({ status }: { status: Order["status"] }) {
  const { t } = useI18n();
  if (status === "synced") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-900">
        <Cloud className="h-3 w-3" /> {t("statusSynced")}
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-900"
        title={t("failedTooltip")}
      >
        <AlertCircle className="h-3 w-3" /> {t("statusFailed")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-900">
      <CloudOff className="h-3 w-3" /> {t("statusPending")}
    </span>
  );
}
