import { z } from 'zod';

export const OrderStatus = z.enum(['pending', 'paid', 'refunded', 'failed']);
export type OrderStatus = z.infer<typeof OrderStatus>;

export const Plan = z.enum(['free', 'pro']);
export type Plan = z.infer<typeof Plan>;

/**
 * Canonical subscription lifecycle statuses. Both the mock and the Stripe
 * writers map into this set (Stripe spells it "canceled", one "l"), so
 * downstream UI/logic never sees the two spellings diverging.
 */
export const SubscriptionStatus = z.enum([
  'active',
  'trialing',
  'canceled',
  'past_due',
  'incomplete',
  'incomplete_expired',
  'unpaid',
  'paused',
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatus>;

export const LineItemSchema = z.object({
  sku: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().nonnegative(),
});
export type LineItem = z.infer<typeof LineItemSchema>;

export const OrderCreateSchema = z.object({
  customerName: z.string().min(1).max(200),
  customerEmail: z.string().email().max(320),
  amountCents: z.number().int().nonnegative(),
  currency: z.string().length(3).default('USD'),
  lineItems: z.array(LineItemSchema).max(200).default([]),
});
export type OrderCreate = z.infer<typeof OrderCreateSchema>;

export const OrderSchema = OrderCreateSchema.extend({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  createdBy: z.string().uuid(),
  status: OrderStatus,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Order = z.infer<typeof OrderSchema>;

export const OrderStatusBreakdownSchema = z.object({
  status: OrderStatus,
  count: z.number().int().nonnegative(),
});
export type OrderStatusBreakdown = z.infer<typeof OrderStatusBreakdownSchema>;

export const OrdersListResponseSchema = z.object({
  orders: z.array(OrderSchema),
  total: z.number().int().nonnegative(),
});
export type OrdersListResponse = z.infer<typeof OrdersListResponseSchema>;

export const DayCountSchema = z.object({
  date: z.string(),
  count: z.number().int().nonnegative(),
});
export type DayCount = z.infer<typeof DayCountSchema>;

export const StatsResponseSchema = z.object({
  totalOrders: z.number().int().nonnegative(),
  revenueCents: z.number().int().nonnegative(),
  avgOrderValueCents: z.number().nonnegative(),
  statusBreakdown: z.array(OrderStatusBreakdownSchema),
  last7Days: z.array(DayCountSchema),
});
export type StatsResponse = z.infer<typeof StatsResponseSchema>;

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const CheckoutRequestSchema = z.object({
  plan: Plan,
  email: z.string().email().optional(),
});
export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;

export const CheckoutResponseSchema = z.object({
  url: z.string(),
  mode: z.enum(['live', 'mock']),
});
export type CheckoutResponse = z.infer<typeof CheckoutResponseSchema>;

export const PortalResponseSchema = z.object({
  url: z.string(),
  mode: z.enum(['live', 'mock']),
});
export type PortalResponse = z.infer<typeof PortalResponseSchema>;

export const PlanInfoSchema = z.object({
  id: Plan,
  name: z.string(),
  priceMonthlyCents: z.number().int().nullable(),
  priceId: z.string().nullable(),
  features: z.array(z.string()),
  highlight: z.boolean().optional(),
});
export type PlanInfo = z.infer<typeof PlanInfoSchema>;

export const SubscriptionInfoSchema = z.object({
  plan: Plan,
  status: SubscriptionStatus,
  currentPeriodEnd: z.string().nullable(),
});
export type SubscriptionInfo = z.infer<typeof SubscriptionInfoSchema>;

export const BillingOverviewSchema = z.object({
  mode: z.enum(['live', 'mock']),
  plans: z.array(PlanInfoSchema),
  subscription: SubscriptionInfoSchema.nullable(),
});
export type BillingOverview = z.infer<typeof BillingOverviewSchema>;
