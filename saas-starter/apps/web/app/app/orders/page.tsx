import type { Order } from '@saas/shared';
import { apiFetch } from '@/lib/api';
import { getT } from '@/lib/server-i18n';
import { OrdersDataGrid } from '@/components/orders-data-grid';

export default async function OrdersPage() {
  const { orders, total } = await apiFetch<{ orders: Order[]; total: number }>(
    'orders?limit=200',
  );
  const t = await getT();

  return (
    <div className="max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t('orders.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('orders.ordersTotal', { n: total })}</p>
      </div>

      <OrdersDataGrid initialOrders={orders} initialTotal={total} />
    </div>
  );
}
