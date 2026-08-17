import type { PrinterState } from "./printer";

export type EventMap = {
  "db:changed": { table: string };
  "mutation:enqueued": { mutationId: string };
  "sync:started": undefined;
  "sync:completed": { synced: number; failed: number; dead: number };
  "order:created": { orderId: string };
  "order:updated": { orderId: string };
  "order:synced": { orderId: string; serverId: string };
  "printer:state": { state: PrinterState; error?: string };
  "print:completed": { orderId?: string; ok: boolean; error?: string };
};

export type EventName = keyof EventMap;

type Listener = (payload: unknown) => void;

/**
 * A tiny typed event bus. Screens subscribe to domain events (order created,
 * mutation enqueued, sync completed) instead of polling — this is what makes
 * every open screen react instantly to changes made elsewhere, including
 * other tabs.
 */
export class EventBus {
  private listeners = new Map<EventName, Set<Listener>>();

  /** Subscribe to an event. Returns an unsubscribe function for the effect's cleanup. */
  on<K extends EventName>(event: K, fn: (payload: EventMap[K]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(fn as Listener);
    return () => this.off(event, fn);
  }

  /**
   * Publish synchronously to every listener. One throwing listener must not
   * break the others — or the emitter — so each call is individually guarded.
   */
  emit<K extends EventName>(event: K, payload: EventMap[K]): void {
    this.listeners.get(event)?.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.error(`[event-bus] listener error for "${event}"`, err);
      }
    });
  }

  /** Unsubscribe a handler that was previously registered with `on`. */
  off<K extends EventName>(event: K, fn: (payload: EventMap[K]) => void): void {
    this.listeners.get(event)?.delete(fn as Listener);
  }
}
