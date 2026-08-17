import { EventBus } from "./events";
import { MutationQueue } from "./mutation-queue";
import type { StorageProvider } from "./storage";
import type { CreateOrderInput, Order, Product, UpdateOrderInput } from "./types";
import { computePricing, normalizeTaxes, round2, vatRate } from "./pricing";
import { randomId } from "./random-id";

const ORDERS_KEY = "offlinepos:orders";
const PRODUCTS_KEY = "offlinepos:products";
const SEQ_KEY = "offlinepos:order-seq";

/**
 * The typed data-access layer. All reads and writes flow through here and
 * land in local storage first — the UI never talks to a network directly.
 * Writes are transactional in the sense that the order is persisted and its
 * mutation is queued before `createOrder` returns.
 */
export class DatabaseManager {
  constructor(
    private storage: StorageProvider,
    private queue: MutationQueue,
    private bus: EventBus,
  ) {}

  // ---- Products -----------------------------------------------------------

  getProducts(): Product[] {
    return this.storage.get<Product[]>(PRODUCTS_KEY) ?? [];
  }

  upsertProducts(products: Product[]): void {
    this.storage.set(PRODUCTS_KEY, products);
    this.bus.emit("db:changed", { table: "products" });
  }

  // ---- Orders -------------------------------------------------------------

  /**
   * Every read re-parses the persisted snapshot and re-normalizes it, so rows
   * saved by older app versions (before multi-tax/discount support) come back
   * in the current shape. Because each call returns fresh objects, callers may
   * freely mutate a result without corrupting what is on disk.
   */
  getOrders(): Order[] {
    return (this.storage.get<Order[]>(ORDERS_KEY) ?? []).map(normalizeOrder);
  }

  findOrder(id: string): Order | undefined {
    return this.getOrders().find((o) => o.id === id);
  }

  /**
   * Write-first, sync-after: the order is stored locally with status
   * "pending" and a create mutation is enqueued. If the sync engine is
   * online it will flush the queue; if not, the order simply waits.
   */
  createOrder(input: CreateOrderInput): Order {
    const id = randomId("ord");
    const pricing = computePricing(input.lines, input.discount, input.taxes);

    const order: Order = {
      id,
      handle: this.nextHandle(),
      status: "pending",
      lines: input.lines.map((line) => ({
        productId: line.productId,
        name: line.name,
        emoji: line.emoji,
        price: line.price,
        quantity: line.quantity,
        lineTotal: line.lineTotal,
      })),
      subtotal: pricing.subtotal,
      discount: pricing.discountAmount,
      discountType: input.discount.type,
      discountValue: input.discount.value,
      taxes: input.taxes.map((tax, i) => ({ ...tax, amount: pricing.taxAmounts[i].amount })),
      taxRate: vatRate(input.taxes),
      tax: pricing.tax,
      total: pricing.total,
      paymentMethod: input.paymentMethod,
      createdAt: Date.now(),
    };

    this.storage.set(ORDERS_KEY, [...this.getOrders(), order]);
    this.queue.enqueue({
      id,
      entity: "order",
      operation: "create",
      payload: { ...order },
    });
    this.bus.emit("order:created", { orderId: order.id });
    this.bus.emit("db:changed", { table: "orders" });
    return order;
  }

  /**
   * Edit an existing order — change line quantities, discount, tax, or payment
   * method. Totals are recomputed locally, the order flips back to "pending",
   * and an `update` mutation supersedes any still-queued `create` for it so the
   * server only ever sees one authoritative version.
   */
  updateOrder(id: string, input: UpdateOrderInput): Order | undefined {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === id);
    if (!order) return undefined;

    const lines = input.lines.map((line) => ({
      productId: line.productId,
      name: line.name,
      emoji: line.emoji,
      price: line.price,
      quantity: line.quantity,
      lineTotal: round2(line.price * line.quantity),
    }));
    const pricing = computePricing(lines, input.discount, input.taxes);

    order.lines = lines;
    order.subtotal = pricing.subtotal;
    order.discount = pricing.discountAmount;
    order.discountType = input.discount.type;
    order.discountValue = input.discount.value;
    order.taxes = input.taxes.map((tax, i) => ({ ...tax, amount: pricing.taxAmounts[i].amount }));
    order.taxRate = vatRate(input.taxes);
    order.tax = pricing.tax;
    order.total = pricing.total;
    order.paymentMethod = input.paymentMethod;
    order.status = "pending";

    this.storage.set(ORDERS_KEY, orders);
    this.queue.remove(id);
    this.queue.enqueue({
      id,
      entity: "order",
      operation: "update",
      payload: { ...order },
    });
    this.bus.emit("order:updated", { orderId: order.id });
    this.bus.emit("db:changed", { table: "orders" });
    return order;
  }

  /**
   * Called by the sync engine when a queued order create succeeds — the
   * server ID replaces the temporary client ID on the stored record.
   */
  applySyncedOrder(tempId: string, serverId: string): void {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === tempId);
    if (!order) return;
    order.status = "synced";
    if (!order.serverId) order.serverId = serverId;
    this.storage.set(ORDERS_KEY, orders);
    this.bus.emit("order:synced", { orderId: tempId, serverId });
    this.bus.emit("db:changed", { table: "orders" });
  }

  applyFailedOrder(tempId: string): void {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === tempId);
    if (!order) return;
    order.status = "failed";
    this.storage.set(ORDERS_KEY, orders);
    this.bus.emit("db:changed", { table: "orders" });
  }

  /**
   * Cashier action on a dead order: requeue the mutation so the sync engine
   * replays it (a re-edit that fixes the payload is the usual reason it
   * succeeds the second time).
   */
  retryOrder(id: string): void {
    const mutation = this.queue.retry(id);
    if (!mutation) return;
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === id);
    if (order) {
      order.status = "pending";
      this.storage.set(ORDERS_KEY, orders);
    }
    this.bus.emit("db:changed", { table: "orders" });
  }

  /**
   * Cashier action on a dead order: drop the mutation and the local record,
   * voiding the sale entirely. The order was never confirmed on the server,
   * so discarding it is safe.
   */
  discardOrder(id: string): void {
    this.queue.remove(id);
    this.storage.set(
      ORDERS_KEY,
      this.getOrders().filter((o) => o.id !== id),
    );
    this.bus.emit("db:changed", { table: "orders" });
  }

  // ---- Internals ----------------------------------------------------------

  /**
   * Human-friendly invoice number: `INV-` + the current date (`YYMMDD`) + a
   * monotonic sequence persisted in storage. The date prefix is cosmetic — the
   * sequence is what keeps handles unique.
   */
  private nextHandle(): string {
    const seq = (this.storage.get<number>(SEQ_KEY) ?? 1000) + 1;
    this.storage.set(SEQ_KEY, seq);
    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `INV-${yy}${mm}${dd}-${seq}`;
  }
}

/**
 * Backfills orders saved before multi-tax/discount-type support: legacy orders
 * carried a single `taxRate` and a flat discount amount. New shapes are
 * preserved as-is. Pure — returns a normalized copy and never mutates input,
 * so it is safe to run over every row on every read.
 */
export function normalizeOrder(order: Order): Order {
  return {
    ...order,
    taxes: Array.isArray(order.taxes)
      ? order.taxes
      : normalizeTaxes(undefined, order.taxRate).map((tax) => ({
          ...tax,
          amount: order.tax ?? 0,
        })),
    discountType: order.discountType ?? "fixed",
    discountValue: order.discountValue ?? order.discount ?? 0,
  };
}
