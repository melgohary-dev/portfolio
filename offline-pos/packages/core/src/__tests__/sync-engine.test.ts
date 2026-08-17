import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryStorageProvider } from "../storage";
import { EventBus } from "../events";
import { MutationQueue, type Mutation } from "../mutation-queue";
import { DatabaseManager } from "../db-manager";
import { MockServer } from "../mock-server";
import { SyncEngine, type SyncFn, type SyncResult } from "../sync-engine";

function setup(overrides: { syncFn?: SyncFn; online?: boolean } = {}) {
  const storage = new MemoryStorageProvider();
  const bus = new EventBus();
  const queue = new MutationQueue(storage, bus);
  const db = new DatabaseManager(storage, queue, bus);
  const online = { value: overrides.online ?? true };
  const syncFn = overrides.syncFn ?? (async () => ({ ok: true, serverId: "svc_1" }));
  const engine = new SyncEngine({
    queue,
    db,
    bus,
    syncFn,
    isOnline: () => online.value,
    baseDelayMs: 100,
    maxDelayMs: 1000,
    maxAttempts: 3,
  });
  return { storage, bus, queue, db, engine, online };
}

function makeOrder(db: DatabaseManager) {
  return db.createOrder({
    lines: [
      { productId: "p1", name: "Latte", emoji: "☕", price: 15, quantity: 2, lineTotal: 30 },
    ],
    discount: { type: "fixed", value: 0 },
    taxes: [{ id: "vat", name: "VAT", kind: "vat", type: "percent", rate: 0.15 }],
    paymentMethod: "cash",
  });
}

describe("SyncEngine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("syncs a pending order and resolves the temp id to a server id", async () => {
    const { queue, db, engine } = setup();
    const order = makeOrder(db);

    expect(order.status).toBe("pending");
    expect(queue.pending()).toHaveLength(1);

    const report = await engine.syncNow();

    expect(report.synced).toBe(1);
    expect(queue.pending()).toHaveLength(0);
    const synced = db.findOrder(order.id);
    expect(synced?.status).toBe("synced");
    expect(synced?.serverId).toBeDefined();
  });

  it("emits order:synced when the server id lands", async () => {
    const { bus, db, engine } = setup();
    const order = makeOrder(db);
    const listener = vi.fn();
    bus.on("order:synced", listener);

    await engine.syncNow();

    expect(listener).toHaveBeenCalledWith({
      orderId: order.id,
      serverId: expect.any(String),
    });
  });

  it("marks permanent validation failures as dead immediately", async () => {
    const { queue, db, engine } = setup({
      syncFn: async () => ({
        ok: false,
        error: "VALIDATION_FAILED: order has no lines",
        permanent: true,
      }),
    });
    makeOrder(db);

    const report = await engine.syncNow();

    expect(report.dead).toBe(1);
    expect(report.remaining).toBe(0);
    expect(queue.byStatus("dead")).toHaveLength(1);
    expect(db.getOrders()[0].status).toBe("failed");
  });

  it("retries transient failures with backoff until maxAttempts", async () => {
    const calls: Mutation[] = [];
    const { queue, db, engine } = setup({
      syncFn: async (mutation) => {
        calls.push(mutation);
        return { ok: false, error: "NETWORK_ERROR: connection reset", permanent: false };
      },
    });
    makeOrder(db);

    await engine.syncNow();
    expect(calls).toHaveLength(1);

    // Backoff retries: 100ms then 200ms (attempts 1, 2), then gives up.
    await vi.advanceTimersByTimeAsync(100);
    expect(calls).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(200);
    expect(calls).toHaveLength(3);

    // After 3 attempts the mutation is dead.
    expect(queue.byStatus("dead")).toHaveLength(1);
    expect(queue.byStatus("dead")[0].error).toContain("Gave up after 3 attempts");
  });

  it("does nothing while offline and leaves the queue intact", async () => {
    const syncFn = vi.fn(async (): Promise<SyncResult> => ({ ok: true, serverId: "svc" }));
    const { queue, db, engine, online } = setup({ syncFn, online: false });
    makeOrder(db);

    const report = await engine.syncNow();

    expect(report.synced).toBe(0);
    expect(report.remaining).toBe(1);
    expect(queue.pending()).toHaveLength(1);
    expect(syncFn).not.toHaveBeenCalled();
    expect(online.value).toBe(false);
  });

  it("emits sync:completed with totals", async () => {
    const { bus, db, engine } = setup();
    makeOrder(db);
    makeOrder(db);
    const listener = vi.fn();
    bus.on("sync:completed", listener);

    await engine.syncNow();

    expect(listener).toHaveBeenCalledWith({ synced: 2, failed: 0, dead: 0 });
  });

  it("syncNow is re-entrant safe (no double flush)", async () => {
    const syncFn = vi.fn(async (): Promise<SyncResult> => ({ ok: true, serverId: "svc" }));
    const { db, engine } = setup({ syncFn });
    makeOrder(db);

    await Promise.all([engine.syncNow(), engine.syncNow()]);

    expect(syncFn).toHaveBeenCalledTimes(1);
  });

  it("recovers when the transport throws — one bad payload cannot kill the flush (C1)", async () => {
    const syncFn = vi.fn(async (): Promise<SyncResult> => {
      throw new Error("BOOM");
    });
    const { queue, db, engine } = setup({ syncFn });
    makeOrder(db);

    const report = await engine.syncNow();

    // The throw is treated like a transient network failure.
    expect(report.failed).toBe(1);
    expect(report.dead).toBe(0);
    expect(queue.pending()).toHaveLength(1);
    expect(queue.pending()[0].attempts).toBe(1);
    expect(queue.pending()[0].error).toBe("BOOM");

    // The engine is still alive: the scheduled retry succeeds.
    syncFn.mockImplementationOnce(async (): Promise<SyncResult> => ({ ok: true, serverId: "svc_2" }));
    await vi.advanceTimersByTimeAsync(100);

    expect(queue.pending()).toHaveLength(0);
    expect(db.getOrders()[0].status).toBe("synced");
  });

  it("marks a mutation dead when the transport keeps throwing past maxAttempts", async () => {
    const { queue, db, engine } = setup({
      syncFn: async (): Promise<SyncResult> => {
        throw new Error("BOOM");
      },
    });
    makeOrder(db);

    await engine.syncNow();
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(200);

    expect(queue.byStatus("dead")).toHaveLength(1);
    expect(queue.byStatus("dead")[0].error).toContain("Gave up after 3 attempts");
  });

  it("re-runs when a retry fires while another flush is mid-flight instead of dropping it (C2)", async () => {
    let call = 0;
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { queue, db, engine } = setup({
      syncFn: async (): Promise<SyncResult> => {
        call += 1;
        if (call === 1) return { ok: false, error: "NETWORK_ERROR", permanent: false };
        if (call === 2) {
          await gate;
          return { ok: false, error: "NETWORK_ERROR", permanent: false };
        }
        return { ok: true, serverId: "svc_3" };
      },
    });
    makeOrder(db);

    // First flush fails transiently and schedules a retry at +100ms.
    await engine.syncNow();
    expect(queue.pending()).toHaveLength(1);

    // A second flush starts and is still in flight when the retry timer fires.
    const running = engine.syncNow();
    await vi.advanceTimersByTimeAsync(100);
    release!();
    await running;

    // The retry was not lost: a third pass ran and synced the mutation.
    expect(call).toBe(3);
    expect(queue.pending()).toHaveLength(0);
    expect(db.getOrders()[0].status).toBe("synced");
  });

  it("re-syncs an edited order via an update mutation", async () => {
    const { queue, db, engine } = setup();
    const order = makeOrder(db);
    await engine.syncNow();
    expect(db.findOrder(order.id)?.status).toBe("synced");
    const originalServerId = db.findOrder(order.id)?.serverId;

    const updated = db.updateOrder(order.id, {
      lines: [
        { productId: "p1", name: "Latte", emoji: "☕", price: 15, quantity: 3 },
      ],
      discount: { type: "fixed", value: 5 },
      taxes: [{ id: "vat", name: "VAT", kind: "vat", type: "percent", rate: 0.05 }],
      paymentMethod: "card",
    });

    expect(updated?.status).toBe("pending");
    expect(updated?.total).toBeCloseTo(42);
    expect(queue.pending()).toHaveLength(1);
    expect(queue.pending()[0].operation).toBe("update");

    const report = await engine.syncNow();

    expect(report.synced).toBe(1);
    expect(queue.pending()).toHaveLength(0);
    const synced = db.findOrder(order.id);
    expect(synced?.status).toBe("synced");
    expect(synced?.total).toBeCloseTo(42);
    // Editing must not lose the canonical server id.
    expect(synced?.serverId).toBe(originalServerId);
  });

  it("start() flushes the queue when a mutation is enqueued", async () => {
    const syncFn = vi.fn(async (): Promise<SyncResult> => ({ ok: true, serverId: "svc" }));
    const { db, engine } = setup({ syncFn });
    engine.start();

    makeOrder(db);

    await vi.advanceTimersByTimeAsync(0);
    expect(syncFn).toHaveBeenCalledTimes(1);
    engine.stop();
  });

  it("stop() clears pending backoff timers", async () => {
    const syncFn = vi.fn(async (): Promise<SyncResult> => ({
      ok: false,
      error: "NETWORK_ERROR",
      permanent: false,
    }));
    const { db, engine } = setup({ syncFn });
    makeOrder(db);

    await engine.syncNow();
    expect(syncFn).toHaveBeenCalledTimes(1);

    engine.stop();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(syncFn).toHaveBeenCalledTimes(1); // no more retries after stop
  });

  it("syncNow with an empty queue returns a zeroed report", async () => {
    const { engine } = setup();
    const report = await engine.syncNow();
    expect(report).toEqual({ total: 0, synced: 0, failed: 0, dead: 0, remaining: 0 });
  });

  it("a dead mutation can be retried and then syncs successfully", async () => {
    let fail = true;
    const { queue, db, engine } = setup({
      syncFn: async (mutation) =>
        fail
          ? { ok: false, error: "VALIDATION_FAILED", permanent: true }
          : { ok: true, serverId: `svc_${mutation.id}` },
    });
    const order = makeOrder(db);
    await engine.syncNow();
    expect(queue.byStatus("dead")).toHaveLength(1);
    expect(db.findOrder(order.id)?.status).toBe("failed");

    // Cashier retries after whatever was wrong got fixed.
    db.retryOrder(order.id);
    fail = false;
    const report = await engine.syncNow();

    expect(report.synced).toBe(1);
    expect(db.findOrder(order.id)?.status).toBe("synced");
    expect(queue.byStatus("dead")).toHaveLength(0);
  });

  it("forcePush overrides a dead conflict so the local edit wins", async () => {
    vi.useRealTimers();
    const server = new MockServer({ transientFailureRate: 0, permanentRate: 0, latencyMs: [0, 0] });
    const { queue, db, engine } = setup({ syncFn: server.sync.bind(server) });
    const order = makeOrder(db);
    await engine.syncNow();
    const serverId = db.findOrder(order.id)?.serverId;

    const updated = db.updateOrder(order.id, {
      lines: [
        { productId: "p1", name: "Latte", emoji: "☕", price: 15, quantity: 3 },
      ],
      discount: { type: "fixed", value: 5 },
      taxes: [{ id: "vat", name: "VAT", kind: "vat", type: "percent", rate: 0.05 }],
      paymentMethod: "card",
    });
    await engine.syncNow();
    expect(queue.byStatus("dead")[0].error).toContain("CONFLICT");
    expect(db.findOrder(order.id)?.status).toBe("failed");

    const result = await engine.forcePush(order.id);

    expect(result?.ok).toBe(true);
    expect(db.findOrder(order.id)?.status).toBe("synced");
    expect(db.findOrder(order.id)?.total).toBe(updated?.total);
    expect(db.findOrder(order.id)?.serverId).toBe(serverId);
    expect(queue.byStatus("dead")).toHaveLength(0);
  });

  it("forcePush passes the force flag to the transport", async () => {
    const syncFn = vi.fn(async (): Promise<SyncResult> => ({ ok: true, serverId: "svc_x" }));
    const { db, engine } = setup({ syncFn });
    const order = makeOrder(db);
    await engine.syncNow();
    syncFn.mockClear();

    const result = await engine.forcePush(order.id);

    expect(result?.ok).toBe(true);
    expect(syncFn).toHaveBeenCalledWith(expect.anything(), true);
  });

  it("forcePush while offline returns an error and leaves the mutation untouched", async () => {
    const { queue, db, engine } = setup({ online: false });
    const order = makeOrder(db);

    const result = await engine.forcePush(order.id);

    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining("OFFLINE"),
      permanent: false,
    });
    expect(queue.byStatus("pending")).toHaveLength(1);
    expect(db.findOrder(order.id)?.status).toBe("pending");
  });

  it("forcePush for an unknown mutation returns null", async () => {
    const { engine } = setup();
    expect(await engine.forcePush("no_such_mutation")).toBeNull();
  });

  it("a forcePush the server still rejects leaves the mutation dead", async () => {
    const { queue, db, engine } = setup({
      syncFn: async () => ({ ok: false, error: "SERVER_REFUSED", permanent: true }),
    });
    const order = makeOrder(db);
    await engine.syncNow();
    expect(queue.byStatus("dead")).toHaveLength(1);

    const result = await engine.forcePush(order.id);

    expect(result?.ok).toBe(false);
    expect(queue.byStatus("dead")).toHaveLength(1);
    expect(db.findOrder(order.id)?.status).toBe("failed");
  });
});
