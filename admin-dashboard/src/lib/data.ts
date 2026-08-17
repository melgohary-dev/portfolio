export type OrderStatus = "paid" | "pending" | "refunded";
export type PaymentMethod = "card" | "wallet" | "cash";
export type UserStatus = "active" | "suspended" | "invited";
export type UserRole = "Admin" | "Cashier" | "Manager";

export interface DashboardStat {
  id: "revenue" | "orders" | "avgOrder" | "refundRate";
  value: string;
  change: number;
  trend: "up" | "down";
  favorable: boolean;
  spark: number[];
}

export interface RevenuePoint {
  month: string;
  revenue: number;
  orders: number;
}

export interface PaymentMethodDatum {
  name: string;
  value: number;
  color: string;
}

export interface TopProduct {
  name: string;
  units: number;
  revenue: number;
  change: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface Order {
  id: string;
  customer: string;
  total: number;
  status: OrderStatus;
  payment: PaymentMethod;
  createdAt: string;
}

export const REVENUE_DATA: RevenuePoint[] = [
  { month: "Sep", revenue: 71400, orders: 428 },
  { month: "Oct", revenue: 76200, orders: 461 },
  { month: "Nov", revenue: 81500, orders: 505 },
  { month: "Dec", revenue: 94200, orders: 588 },
  { month: "Jan", revenue: 86800, orders: 534 },
  { month: "Feb", revenue: 90100, orders: 552 },
  { month: "Mar", revenue: 95400, orders: 590 },
  { month: "Apr", revenue: 100600, orders: 625 },
  { month: "May", revenue: 106900, orders: 662 },
  { month: "Jun", revenue: 114300, orders: 709 },
  { month: "Jul", revenue: 121600, orders: 741 },
  { month: "Aug", revenue: 128400, orders: 720 },
];

export const PAYMENT_METHODS: PaymentMethodDatum[] = [
  { name: "Card", value: 79600, color: "#1074b8" },
  { name: "Wallet", value: 29500, color: "#1140b8" },
  { name: "Cash", value: 19300, color: "#cbd5e1" },
];

export const TOP_PRODUCTS: TopProduct[] = [
  { name: "Luxury Oud Perfume", units: 96, revenue: 20160, change: 5.2 },
  { name: "Arabic Coffee Blend 500g", units: 214, revenue: 14980, change: 12.4 },
  { name: "Dates Gift Box", units: 158, revenue: 12640, change: 8.7 },
  { name: "Handmade Pottery Set", units: 74, revenue: 11840, change: -3.1 },
  { name: "Saudi Golden Thread", units: 52, revenue: 9360, change: 2.4 },
];

export const USERS: User[] = [
  { id: "u1", name: "Salma Al-Rashid", email: "salma@example.com", role: "Admin", status: "active", createdAt: "2026-01-12" },
  { id: "u2", name: "Omar Farouk", email: "omar@example.com", role: "Manager", status: "active", createdAt: "2026-02-03" },
  { id: "u3", name: "Noura Hassan", email: "noura@example.com", role: "Cashier", status: "active", createdAt: "2026-02-18" },
  { id: "u4", name: "Khalid Mansour", email: "khalid@example.com", role: "Cashier", status: "suspended", createdAt: "2026-03-01" },
  { id: "u5", name: "Layla Ali", email: "layla@example.com", role: "Manager", status: "invited", createdAt: "2026-06-20" },
];

export const ORDERS: Order[] = [
  { id: "ORD-1001", customer: "Salma Al-Rashid", total: 185, status: "paid", payment: "card", createdAt: "2026-08-01T09:22:00Z" },
  { id: "ORD-1002", customer: "Omar Farouk", total: 62, status: "paid", payment: "cash", createdAt: "2026-08-01T09:47:00Z" },
  { id: "ORD-1003", customer: "Noura Hassan", total: 224, status: "pending", payment: "wallet", createdAt: "2026-08-01T10:05:00Z" },
  { id: "ORD-1004", customer: "Khalid Mansour", total: 47, status: "refunded", payment: "card", createdAt: "2026-07-31T18:12:00Z" },
  { id: "ORD-1005", customer: "Layla Ali", total: 130, status: "paid", payment: "cash", createdAt: "2026-07-31T17:03:00Z" },
];
