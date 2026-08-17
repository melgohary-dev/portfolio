import { bus } from "@offlinepos/core/browser";
import type { EventMap } from "@offlinepos/core";
import { useCartStore } from "../store/cart";
import { useTabStore } from "../store/tab";

const CHANNEL = "offlinepos:sync";
const REGISTRY_KEY = "offlinepos:tab-registry";
// Must match the persist name in src/store/cart.ts — a string coupling; keep
// them in sync when either renames the storage key.
const CART_KEY = "offlinepos:cart";
const BEAT_MS = 2000;
const STALE_MS = 6000;

/**
 * Events worth broadcasting across tabs. `db:changed` alone would cover most
 * screens (OrdersPage re-reads the db on it); `order:synced` keeps the sidebar
 * counters live in every tab too.
 *
 * `mutation:enqueued` is deliberately NOT forwarded: sync is single-tab, so a
 * pending count only changes in the tab that owns the flush. The first tab to
 * actually sync the mutation broadcasts `order:synced`, and every tab refreshes
 * from that.
 */
type ForwardedEvent = "db:changed" | "order:synced";

interface RemoteMessage {
  event: ForwardedEvent;
  payload: EventMap[ForwardedEvent];
  tabId: string;
  at: number;
}

/**
 * Cross-tab coordination for the local-first demo:
 *
 *  1. BroadcastChannel forwards `db:changed` / `order:synced` so every open
 *     tab re-renders (orders list, counters) the moment another tab changes
 *     something.
 *  2. A heartbeat registry in localStorage (`offlinepos:tab-registry`) tells
 *     each tab how many peers are live; `storage` events update the count
 *     without any polling across tabs.
 *  3. A `storage` event on `offlinepos:cart` refreshes the parked-orders
 *     shelf when another tab parks/resumes a cart.
 *
 * Events received from the channel are re-emitted on the local bus so screens
 * react through the exact same code path as local changes. A guard flag stops
 * re-forwarding them back to the channel (no ping-pong loop).
 */
export function startTabSync(): () => void {
  const channel =
    typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL) : null;
  const tabId = useTabStore.getState().tabId;

  let forwardingRemote = false;

  const forward = <K extends ForwardedEvent>(event: K, payload: EventMap[K]) => {
    if (forwardingRemote) return;
    const message: RemoteMessage = { event, payload, tabId, at: Date.now() };
    channel?.postMessage(message);
  };

  const offs = [
    bus.on("db:changed", (p) => forward("db:changed", p)),
    bus.on("order:synced", (p) => forward("order:synced", p)),
  ];

  const onMessage = (msg: MessageEvent<RemoteMessage>) => {
    const data = msg.data;
    if (!data?.event || data.tabId === tabId) return;
    useTabStore.getState().setLastRemote({ event: data.event, at: data.at });
    // The guard is only safe because bus.emit is synchronous — the re-emit
    // finishes before `forwardingRemote` is reset, so a listener that forwards
    // back can never send a mirror of this very message.
    forwardingRemote = true;
    try {
      bus.emit(data.event as keyof EventMap, data.payload as never);
    } finally {
      forwardingRemote = false;
    }
  };
  channel?.addEventListener("message", onMessage);

  /**
   * Publish this tab's heartbeat. The registry write is skipped when `interval`
   * is true and this tab's own entry is still fresh (< BEAT_MS): a beat that
   * would just repeat the previous snapshot is pointless work and fires a
   * spurious `storage` event in every peer. Freshness gets restored by the
   * immediate `visibilitychange` write, so peers still hear from us promptly.
   */
  const beat = (interval: boolean) => {
    try {
      const raw = localStorage.getItem(REGISTRY_KEY);
      const registry: Record<string, number> = raw ? (JSON.parse(raw) as Record<string, number>) : {};
      const ownLastSeen = registry[tabId];
      if (interval && ownLastSeen !== undefined && Date.now() - ownLastSeen < BEAT_MS) {
        return;
      }
      registry[tabId] = Date.now();
      for (const [id, lastSeen] of Object.entries(registry)) {
        if (Date.now() - lastSeen > STALE_MS) delete registry[id];
      }
      localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
      useTabStore.getState().setTabsLive(Object.keys(registry).length);
    } catch {
      /* registry unavailable — non-fatal */
    }
  };
  beat(false);
  const interval = setInterval(() => beat(true), BEAT_MS);

  // A tab that was backgrounded (timers throttled, possibly hours stale) must
  // re-publish itself the moment it is visible again.
  const onVisibility = () => {
    if (document.visibilityState === "visible") beat(false);
  };
  document.addEventListener("visibilitychange", onVisibility);

  const onStorage = (e: StorageEvent) => {
    if (!e.key) return;
    if (e.key === REGISTRY_KEY) {
      try {
        const registry: Record<string, number> = e.newValue ? (JSON.parse(e.newValue) as Record<string, number>) : {};
        useTabStore.getState().setTabsLive(Object.keys(registry).length);
      } catch {
        /* ignore malformed registry */
      }
    } else if (e.key === CART_KEY) {
      useCartStore.getState().syncParkedFromStorage();
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    offs.forEach((off) => off());
    channel?.removeEventListener("message", onMessage);
    channel?.close();
    clearInterval(interval);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("storage", onStorage);
    try {
      const raw = localStorage.getItem(REGISTRY_KEY);
      if (raw) {
        const registry: Record<string, number> = JSON.parse(raw) as Record<string, number>;
        delete registry[tabId];
        localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
      }
    } catch {
      /* ignore */
    }
  };
}
