import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryStorageProvider } from "../storage";
import { EventBus } from "../events";
import { MutationQueue } from "../mutation-queue";

function setup() {
  const storage = new MemoryStorageProvider();
  const bus = new EventBus();
  const queue = new MutationQueue(storage, bus);
  return { storage, bus, queue };
}

describe("MutationQueue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("enqueues a pending mutation and emits an event", () => {
    const { bus, queue } = setup();
    const listener = vi.fn();
    bus.on("mutation:enqueued", listener);

    const mutation = queue.enqueue({ entity: "order", operation: "create", payload: { total: 10 } });

    expect(mutation.status).toBe("pending");
    expect(mutation.attempts).toBe(0);
    expect(queue.pending()).toHaveLength(1);
    expect(listener).toHaveBeenCalledWith({ mutationId: mutation.id });
  });

  it("persists mutations across reloads (same storage provider)", () => {
    const { storage, bus, queue } = setup();
    queue.enqueue({ entity: "order", operation: "create", payload: { total: 10 } });

    const reloaded = new MutationQueue(storage, bus);
    expect(reloaded.pending()).toHaveLength(1);
  });

  it("marks a mutation synced with a server id", () => {
    const { queue } = setup();
    const mutation = queue.enqueue({ entity: "order", operation: "create", payload: {} });

    queue.markSynced(mutation.id, "svc_123");

    expect(queue.pending()).toHaveLength(0);
    const synced = queue.byStatus("synced");
    expect(synced).toHaveLength(1);
    expect(synced[0].serverId).toBe("svc_123");
  });

  it("marks a mutation dead with an error", () => {
    const { queue } = setup();
    const mutation = queue.enqueue({ entity: "order", operation: "create", payload: {} });

    queue.markDead(mutation.id, "VALIDATION_FAILED");

    expect(queue.byStatus("dead")).toHaveLength(1);
    expect(queue.pending()).toHaveLength(0);
  });

  it("retries a dead mutation back to pending and emits an event", () => {
    const { bus, queue } = setup();
    const mutation = queue.enqueue({ entity: "order", operation: "create", payload: {} });
    queue.markDead(mutation.id, "VALIDATION_FAILED");
    const listener = vi.fn();
    bus.on("mutation:enqueued", listener);

    const retried = queue.retry(mutation.id);

    expect(retried?.status).toBe("pending");
    expect(retried?.attempts).toBe(0);
    expect(retried?.error).toBeUndefined();
    expect(queue.pending()).toHaveLength(1);
    expect(listener).toHaveBeenCalledWith({ mutationId: mutation.id });
  });

  it("does not retry a mutation that is not dead", () => {
    const { queue } = setup();
    const mutation = queue.enqueue({ entity: "order", operation: "create", payload: {} });

    expect(queue.retry(mutation.id)).toBeNull();
    expect(queue.pending()).toHaveLength(1);
  });

  it("tracks retry attempts", () => {
    const { queue } = setup();
    const mutation = queue.enqueue({ entity: "order", operation: "create", payload: {} });

    expect(queue.bumpAttempt(mutation.id, "NETWORK_ERROR")).toBe(1);
    expect(queue.bumpAttempt(mutation.id, "NETWORK_ERROR")).toBe(2);

    const reloaded = queue.load();
    expect(reloaded[0].attempts).toBe(2);
    expect(reloaded[0].error).toBe("NETWORK_ERROR");
  });

  it("prunes old synced mutations but keeps pending ones", () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const { queue } = setup();
    const old = queue.enqueue({ entity: "order", operation: "create", payload: {} });
    queue.markSynced(old.id, "svc_1");

    vi.setSystemTime(new Date("2026-01-03T00:00:00Z"));
    const fresh = queue.enqueue({ entity: "order", operation: "create", payload: {} });

    const removed = queue.prune(24 * 60 * 60 * 1000);

    expect(removed).toBe(1);
    expect(queue.load().map((m) => m.id)).toEqual([fresh.id]);
  });
});
