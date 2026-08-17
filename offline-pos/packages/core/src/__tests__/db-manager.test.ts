import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryStorageProvider } from "../storage";
import { EventBus } from "../events";
import { MutationQueue } from "../mutation-queue";
import { DatabaseManager } from "../db-manager";
import type { CreateOrderInput } from "../types";

function setup() {
  const storage = new MemoryStorageProvider();
  const bus = new EventBus();
  const queue = new MutationQueue(storage, bus);
  const db = new DatabaseManager(storage, queue, bus);
  return { storage, bus, queue, db };
}

const INPUT: CreateOrderInput = {
  lines: [
    { productId: "p1", name: "Latte", emoji: "☕", price: 15, quantity: 2, lineTotal: 30 },
    { productId: "p2", name: "Croissant", emoji: "🥐", price: 12, quantity: 1, lineTotal: 12 },
  ],
  discount: { type: "percent", value: 0.1 },
  taxes: [{ id: "vat", name: "VAT", kind: "vat", type: "percent", rate: 0.15 }],
  paymentMethod: "card",
};

describe("DatabaseManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("creates an order, persists it, and enqueues a matching mutation", () => {
    const { db, queue, bus } = setup();
    const listener = vi.fn();
    bus.on("order:created", listener);

    const order = db.createOrder(INPUT);

    expect(order.status).toBe("pending");
    expect(order.total).toBeCloseTo(43.47); // (42 - 4.2) * 1.15
    expect(db.getOrders()).toHaveLength(1);
    expect(queue.pending()).toHaveLength(1);
    expect(queue.pending()[0].id).toBe(order.id);
    expect(queue.pending()[0].operation).toBe("create");
    expect(listener).toHaveBeenCalledWith({ orderId: order.id });
  });

  it("assigns monotonic handles", () => {
    const { db } = setup();
    const first = db.createOrder(INPUT);
    const second = db.createOrder(INPUT);
    expect(second.handle).not.toBe(first.handle);
    expect(second.handle).toMatch(/^INV-\d{6}-\d+$/);
  });

  it("finds an order by id", () => {
    const { db } = setup();
    const order = db.createOrder(INPUT);
    expect(db.findOrder(order.id)?.handle).toBe(order.handle);
    expect(db.findOrder("missing")).toBeUndefined();
  });

  it("updates an order and supersedes its create mutation", () => {
    const { db, queue } = setup();
    const order = db.createOrder(INPUT);

    const updated = db.updateOrder(order.id, {
      lines: INPUT.lines,
      discount: { type: "fixed", value: 5 },
      taxes: [{ id: "vat", name: "VAT", kind: "vat", type: "percent", rate: 0.05 }],
      paymentMethod: "cash",
    });

    expect(updated?.status).toBe("pending");
    expect(updated?.paymentMethod).toBe("cash");
    const mutations = queue.load();
    expect(mutations).toHaveLength(1); // create was replaced
    expect(mutations[0].operation).toBe("update");
  });

  it("applies a server id when the create syncs", () => {
    const { db, bus } = setup();
    const order = db.createOrder(INPUT);
    const listener = vi.fn();
    bus.on("order:synced", listener);

    db.applySyncedOrder(order.id, "svc_abc");

    const synced = db.findOrder(order.id);
    expect(synced?.status).toBe("synced");
    expect(synced?.serverId).toBe("svc_abc");
    expect(listener).toHaveBeenCalledWith({ orderId: order.id, serverId: "svc_abc" });
  });

  it("marks an order failed via applyFailedOrder", () => {
    const { db } = setup();
    const order = db.createOrder(INPUT);
    db.applyFailedOrder(order.id);
    expect(db.findOrder(order.id)?.status).toBe("failed");
  });

  it("retries a dead order: requeues and flips the order back to pending", () => {
    const { db, queue } = setup();
    const order = db.createOrder(INPUT);
    queue.markDead(order.id, "VALIDATION_FAILED");

    db.retryOrder(order.id);

    expect(db.findOrder(order.id)?.status).toBe("pending");
    expect(queue.pending()).toHaveLength(1);
    expect(queue.pending()[0].attempts).toBe(0);
  });

  it("discards a dead order: removes the mutation and the local record", () => {
    const { db, queue } = setup();
    const order = db.createOrder(INPUT);
    queue.markDead(order.id, "VALIDATION_FAILED");

    db.discardOrder(order.id);

    expect(queue.load()).toHaveLength(0);
    expect(db.findOrder(order.id)).toBeUndefined();
    expect(db.getOrders()).toHaveLength(0);
  });

  it("reports pending orders from the current snapshot", () => {
    const { db } = setup();
    expect(db.getOrders().filter((o) => o.status === "pending")).toHaveLength(0);
    db.createOrder(INPUT);
    db.createOrder(INPUT);
    expect(db.getOrders().filter((o) => o.status === "pending")).toHaveLength(2);
    db.applyFailedOrder(db.getOrders()[0].id);
    expect(db.getOrders().filter((o) => o.status === "pending")).toHaveLength(1);
  });

  it("upserts products and emits db:changed", () => {
    const { db, bus } = setup();
    const listener = vi.fn();
    bus.on("db:changed", listener);

    db.upsertProducts([
      { id: "p1", name: "Latte", nameAr: "لاتيه", category: "hot", price: 15, emoji: "☕", image: "", inStock: true },
    ]);

    expect(db.getProducts()).toHaveLength(1);
    expect(listener).toHaveBeenCalledWith({ table: "products" });
  });
});
