import { and, desc, eq, gte, sql } from 'drizzle-orm';
import type { Database } from './client.js';
import { orders, subscriptions, type LineItem, type OrderStatusValue } from './schema.js';

export type ScopedOrderCreate = {
  createdBy: string;
  customerName: string;
  customerEmail: string;
  amountCents: number;
  currency?: string;
  lineItems: LineItem[];
};

export type ScopedOrderList = {
  rows: (typeof orders.$inferSelect)[];
  total: number;
};

export type StatsResult = {
  totalOrders: number;
  revenueCents: number;
  avgOrderValueCents: number;
  statusBreakdown: { status: OrderStatusValue; count: number }[];
  last7Days: { date: string; count: number }[];
};

/**
 * RLS-ready pattern: every tenant query goes through `where(eq(table.tenant_id, tenantId))`.
 * Future Phase-3 auth resolves the tenant from the session; the API layer only ever
 * talks to these helpers (never to raw tables).
 */
export function tenantScoped(db: Database, tenantId: string) {
  const tenantFilter = eq(orders.tenantId, tenantId);

  return {
    orders: {
      list: async (opts: {
        limit?: number;
        offset?: number;
        status?: OrderStatusValue;
      }): Promise<ScopedOrderList> => {
        const limit = Math.min(opts.limit ?? 50, 200);
        const offset = opts.offset ?? 0;
        const where = opts.status
          ? and(tenantFilter, eq(orders.status, opts.status))
          : tenantFilter;
        const rows = await db
          .select()
          .from(orders)
          .where(where)
          .orderBy(desc(orders.createdAt))
          .limit(limit)
          .offset(offset);
        const [totalRow] = await db
          .select({ value: sql<number>`count(*)::int` })
          .from(orders)
          .where(where);
        return { rows, total: totalRow?.value ?? 0 };
      },

      create: async (data: ScopedOrderCreate) => {
        const [row] = await db
          .insert(orders)
          .values({
            tenantId,
            createdBy: data.createdBy,
            customerName: data.customerName,
            customerEmail: data.customerEmail,
            amountCents: data.amountCents,
            currency: data.currency ?? 'USD',
            lineItems: data.lineItems ?? [],
          })
          .returning();
        if (!row) {
          throw new Error('order insert returned no row');
        }
        return row;
      },

      find: async (id: string) => {
        const [row] = await db.select().from(orders).where(and(tenantFilter, eq(orders.id, id)));
        return row;
      },

      stats: async (): Promise<StatsResult> => {
        const [agg] = await db
          .select({
            totalOrders: sql<number>`count(*)::int`,
            revenueCents: sql<number>`coalesce(sum(amount_cents) filter (where status = 'paid'), 0)::int`,
            avgOrderValueCents: sql<number>`coalesce(avg(amount_cents) filter (where status = 'paid'), 0)::numeric(12, 2)`,
          })
          .from(orders)
          .where(tenantFilter);

        const breakdownRows = await db
          .select({ status: orders.status, count: sql<number>`count(*)::int` })
          .from(orders)
          .where(tenantFilter)
          .groupBy(orders.status);

        // Bucket boundaries and keys are both computed in UTC (Date.UTC +
        // toISOString). Mixing local-midnight boundaries with UTC keys would
        // drop/split the day a timezone crosses midnight, so the whole range
        // stays timezone-agnostic.
        const now = new Date();
        const startUtc =
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
          6 * 24 * 60 * 60 * 1000;
        const sevenDaysAgo = new Date(startUtc);
        const recent = await db
          .select({ createdAt: orders.createdAt })
          .from(orders)
          .where(and(tenantFilter, gte(orders.createdAt, sevenDaysAgo)));

        const byDay = new Map<string, number>();
        for (let i = 0; i < 7; i++) {
          const d = new Date(startUtc + i * 24 * 60 * 60 * 1000);
          byDay.set(d.toISOString().slice(0, 10), 0);
        }
        for (const row of recent) {
          const key = row.createdAt.toISOString().slice(0, 10);
          byDay.set(key, (byDay.get(key) ?? 0) + 1);
        }
        const last7Days = [...byDay.entries()].map(([date, count]) => ({ date, count }));

        return {
          totalOrders: agg?.totalOrders ?? 0,
          revenueCents: agg ? Number(agg.revenueCents) : 0,
          avgOrderValueCents: agg ? Number(agg.avgOrderValueCents) : 0,
          statusBreakdown: breakdownRows.map((r) => ({ status: r.status, count: r.count })),
          last7Days,
        };
      },
    },

    subscriptions: {
      get: async () => {
        const [row] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.tenantId, tenantId));
        return row;
      },
    },
  };
}
