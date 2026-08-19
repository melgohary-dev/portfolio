"use client";

import { useSettings } from "@/components/settings-provider";
import { OrdersDataGrid } from "@/components/orders-data-grid";

export default function OrdersPage() {
  const { t } = useSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {t("nav.orders")}
        </h1>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          {t("dashboard.recentOrdersSubtitle")}
        </p>
      </div>

      <OrdersDataGrid />
    </div>
  );
}
