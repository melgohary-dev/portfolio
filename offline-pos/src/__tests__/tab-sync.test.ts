import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { bus } from "@offlinepos/core/browser";
import { startTabSync } from "../lib/tab-sync";
import { useTabStore } from "../store/tab";
import { useCartStore } from "../store/cart";

const CHANNEL = "offlinepos:sync";
const REGISTRY_KEY = "offlinepos:tab-registry";
const CART_KEY = "offlinepos:cart";

class FakeChannel {
  name = CHANNEL;
  posted: unknown[] = [];
  listener: ((msg: { data: unknown }) => void) | null = null;

  postMessage(message: unknown): void {
    this.posted.push(message);
  }

  addEventListener(_type: string, listener: (msg: { data: unknown }) => void): void {
    this.listener = listener;
  }

  removeEventListener(_type: string, listener: unknown): void {
    if (this.listener === listener) this.listener = null;
  }

  close(): void {}
}

describe("startTabSync", () => {
  let channel: FakeChannel;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
    channel = new FakeChannel();
    vi.stubGlobal("BroadcastChannel", class {
      constructor() {
        return channel;
      }
    });
    useTabStore.setState({ tabsLive: 1, lastRemoteEvent: null, lastRemoteAt: null });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("forwards bus events to the channel and skips itself after a remote echo", () => {
    const stop = startTabSync();

    bus.emit("db:changed", { table: "orders" });
    expect(channel.posted).toHaveLength(1);
    const msg = channel.posted[0] as { event: string };
    expect(msg.event).toBe("db:changed");

    // A remote echo must not be re-broadcast (no ping-pong loop).
    channel.listener?.({ data: { event: "db:changed", payload: { table: "orders" }, tabId: "other", at: 1 } });
    expect(channel.posted).toHaveLength(1);
    stop();
  });

  it("re-emits remote events on the local bus", () => {
    const listener = vi.fn();
    bus.on("order:synced", listener);
    const stop = startTabSync();

    channel.listener?.({ data: { event: "order:synced", payload: { orderId: "x", serverId: "s" }, tabId: "other", at: 42 } });

    expect(listener).toHaveBeenCalledWith({ orderId: "x", serverId: "s" });
    expect(useTabStore.getState().lastRemoteEvent).toBe("order:synced");
    stop();
  });

  it("does not forward mutation:enqueued — sync stays single-tab (H4)", () => {
    const stop = startTabSync();

    bus.emit("mutation:enqueued", { mutationId: "m1" });

    expect(channel.posted).toHaveLength(0);
    stop();
  });

  it("skips the interval registry write while the heartbeat is fresh (L5)", () => {
    const stop = startTabSync();
    const registry = JSON.parse(localStorage.getItem(REGISTRY_KEY) ?? "{}");
    registry.peer = Date.now() - 60_000;
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));

    // A fresh heartbeat lands mid-interval (the tab was made visible again).
    vi.advanceTimersByTime(500);
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    const written = localStorage.getItem(REGISTRY_KEY);

    // The next interval beat sees a still-fresh own entry → no re-write.
    vi.advanceTimersByTime(1500);
    expect(localStorage.getItem(REGISTRY_KEY)).toBe(written);
    stop();
  });

  it("re-publishes the heartbeat when the tab becomes visible again (L5)", () => {
    const stop = startTabSync();
    const tabId = useTabStore.getState().tabId;
    vi.advanceTimersByTime(500);
    const before = JSON.parse(localStorage.getItem(REGISTRY_KEY) ?? "{}")[tabId] as number;

    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    const after = JSON.parse(localStorage.getItem(REGISTRY_KEY) ?? "{}")[tabId] as number;
    expect(after).toBeGreaterThan(before);
    stop();
  });

  it("publishes and prunes the heartbeat registry", () => {
    const stop = startTabSync();
    const registry = JSON.parse(localStorage.getItem(REGISTRY_KEY) ?? "{}");
    const tabId = useTabStore.getState().tabId;
    expect(registry[tabId]).toBeDefined();
    expect(useTabStore.getState().tabsLive).toBe(Object.keys(registry).length);

    // A peer with a stale heartbeat gets pruned.
    registry.peer = Date.now() - 60_000;
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
    vi.advanceTimersByTime(2000);
    const pruned = JSON.parse(localStorage.getItem(REGISTRY_KEY) ?? "{}");
    expect(pruned.peer).toBeUndefined();
    stop();
  });

  it("updates the live count from a storage event on the registry", () => {
    const stop = startTabSync();
    useTabStore.setState({ tabsLive: 1 });
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: REGISTRY_KEY,
        newValue: JSON.stringify({ a: Date.now(), b: Date.now() }),
      }),
    );
    expect(useTabStore.getState().tabsLive).toBe(2);
    stop();
  });

  it("refreshes parked carts from a cart storage event", () => {
    const stop = startTabSync();
    localStorage.setItem(CART_KEY, JSON.stringify({ state: { parked: [{ id: "pkd_1", label: "x", savedAt: 1, lines: [], discount: { type: "fixed", value: 0 }, taxes: [], paymentMethod: "cash" }] } }));
    window.dispatchEvent(
      new StorageEvent("storage", { key: CART_KEY, newValue: "x" }),
    );
    expect(useCartStore.getState().parked.map((p) => p.id)).toEqual(["pkd_1"]);
    stop();
  });

  it("cleans up the registry and listeners on stop", () => {
    const busSpy = vi.fn();
    const stop = startTabSync();
    const tabId = useTabStore.getState().tabId;

    stop();

    const registry = JSON.parse(localStorage.getItem(REGISTRY_KEY) ?? "{}");
    expect(registry[tabId]).toBeUndefined();
    expect(channel.listener).toBeNull();

    bus.on("db:changed", busSpy);
    bus.emit("db:changed", { table: "orders" });
    expect(busSpy).toHaveBeenCalledTimes(1); // bus still works
    expect(channel.posted).toHaveLength(0); // but nothing is forwarded
  });

  it("tolerates a missing BroadcastChannel", () => {
    vi.stubGlobal("BroadcastChannel", undefined);
    const stop = startTabSync();
    const registry = JSON.parse(localStorage.getItem(REGISTRY_KEY) ?? "{}");
    expect(Object.keys(registry).length).toBe(1);
    stop();
  });
});
