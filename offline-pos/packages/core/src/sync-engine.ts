import { EventBus } from "./events";
import { DatabaseManager } from "./db-manager";
import { MutationQueue, type Mutation } from "./mutation-queue";

export type SyncResult =
  | { ok: true; serverId: string }
  | { ok: false; error: string; permanent: boolean };

export type SyncFn = (mutation: Mutation, force?: boolean) => Promise<SyncResult>;

export interface SyncReport {
  total: number;
  synced: number;
  failed: number;
  dead: number;
  remaining: number;
}

export interface SyncEngineOptions {
  queue: MutationQueue;
  db: DatabaseManager;
  bus: EventBus;
  /** The transport — in the demo it is a MockServer, in production a GraphQL mutation. */
  syncFn: SyncFn;
  /** True when the device has connectivity. */
  isOnline: () => boolean;
  baseDelayMs?: number;
  maxDelayMs?: number;
  maxAttempts?: number;
}

/**
 * Replays the local mutation queue against the server.
 *
 * - Transient failures (network) retry with exponential backoff and give up
 *   only after `maxAttempts`.
 * - Permanent failures (validation, not-found) are marked "dead" immediately
 *   and surfaced in the UI — retrying a bad payload can't fix it.
 * - Success swaps the temporary client ID for the real server ID.
 */
export class SyncEngine {
  private queue: MutationQueue;
  private db: DatabaseManager;
  private bus: EventBus;
  private syncFn: SyncFn;
  private isOnline: () => boolean;
  private baseDelayMs: number;
  private maxDelayMs: number;
  private maxAttempts: number;
  private running = false;
  private retryTimers = new Set<ReturnType<typeof setTimeout>>();
  private unbind: (() => void) | null = null;
  /** A retry timer fired while a flush was still in flight — rerun once free. */
  private rerunPending = false;

  constructor(options: SyncEngineOptions) {
    this.queue = options.queue;
    this.db = options.db;
    this.bus = options.bus;
    this.syncFn = options.syncFn;
    this.isOnline = options.isOnline;
    this.baseDelayMs = options.baseDelayMs ?? 2000;
    this.maxDelayMs = options.maxDelayMs ?? 30_000;
    this.maxAttempts = options.maxAttempts ?? 4;
  }

  /**
   * Subscribe to events so a reconnect or a new mutation triggers a flush.
   * Idempotent: calling again while already started is a no-op.
   */
  start(): void {
    if (this.unbind) return;
    const onEnqueued = () => {
      if (this.isOnline()) void this.syncNow();
    };
    this.unbind = this.bus.on("mutation:enqueued", onEnqueued);
  }

  /**
   * Unsubscribe and cancel any pending retry timers. Also idempotent; the
   * retry cancellation matters when the app goes offline or the tab is
   * hidden — a stale timer must not flush later behind the user's back.
   */
  stop(): void {
    this.unbind?.();
    this.unbind = null;
    this.retryTimers.forEach((timer) => clearTimeout(timer));
    this.retryTimers.clear();
  }

  /**
   * Flush the whole pending queue, oldest first.
   *
   * Concurrency contract: only one flush runs at a time. If `syncNow` is
   * called while a flush is in flight (another tab, a retry timer, a new
   * mutation) it records `rerunPending` so the running flush re-flushes when
   * it finishes — a retry request is never silently dropped. Each call emits
   * `sync:completed`, including the short-circuited one.
   */
  async syncNow(): Promise<SyncReport> {
    const emptyReport: SyncReport = {
      total: 0,
      synced: 0,
      failed: 0,
      dead: 0,
      remaining: this.queue.pending().length,
    };

    if (!this.isOnline()) {
      return emptyReport;
    }
    if (this.running) {
      // A retry wants to run but we're mid-flush — make sure it actually
      // happens instead of being lost (C2).
      this.rerunPending = true;
      this.bus.emit("sync:completed", emptyReport);
      return emptyReport;
    }

    const pending = this.queue.pending();
    if (pending.length === 0) {
      return { ...emptyReport, remaining: 0 };
    }

    this.running = true;
    this.bus.emit("sync:started", undefined);

    let synced = 0;
    let failed = 0;
    let dead = 0;

    try {
      for (const mutation of pending) {
        if (!this.isOnline()) {
          failed += pending.slice(pending.indexOf(mutation)).length;
          break;
        }

        // A throwing transport must not take down the whole flush or leave
        // `running` set forever — treat it like a transient network error so
        // the mutation is retried and the rest of the queue still gets a turn
        // (C1).
        let result: SyncResult;
        try {
          result = await this.syncFn(mutation);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          result = { ok: false, error: message, permanent: false };
        }

        if (result.ok) {
          this.queue.markSynced(mutation.id, result.serverId);
          if (mutation.entity === "order") {
            this.db.applySyncedOrder(mutation.id, result.serverId);
          }
          synced += 1;
          continue;
        }

        if (result.permanent) {
          this.queue.markDead(mutation.id, result.error);
          if (mutation.entity === "order") {
            this.db.applyFailedOrder(mutation.id);
          }
          dead += 1;
          continue;
        }

        // Transient failure → retry with backoff.
        const attempts = this.queue.bumpAttempt(mutation.id, result.error);
        failed += 1;
        if (attempts < this.maxAttempts) {
          this.scheduleRetry(attempts);
        } else {
          this.queue.markDead(mutation.id, `Gave up after ${attempts} attempts: ${result.error}`);
          dead += 1;
        }
      }
    } finally {
      // Reset *before* emitting so the completion handler (e.g. the UI) can
      // safely trigger a new flush without being short-circuited.
      this.running = false;
      this.bus.emit("sync:completed", { synced, failed, dead });
    }

    if (this.rerunPending && this.isOnline()) {
      this.rerunPending = false;
      return this.syncNow();
    }

    return {
      total: pending.length,
      synced,
      failed,
      dead,
      remaining: this.queue.pending().length,
    };
  }

  /**
   * Replays one mutation outside the normal queue, telling the transport the
   * local copy is authoritative (`force = true`). This is the escape hatch
   * for dead mutations where the server conflicts with a cashier's edit — the
   * client's version wins and overwrites the server record.
   *
   * Returns `null` when the mutation no longer exists, or the transport's
   * result otherwise (a forced push that still fails leaves the mutation dead).
   */
  async forcePush(id: string): Promise<SyncResult | null> {
    const mutation = this.queue.load().find((m) => m.id === id);
    if (!mutation) return null;
    if (!this.isOnline()) {
      return { ok: false, error: "OFFLINE: cannot force push without a connection", permanent: false };
    }

    this.bus.emit("sync:started", undefined);
    const result = await this.syncFn(mutation, true);

    if (result.ok) {
      this.queue.markSynced(mutation.id, result.serverId);
      if (mutation.entity === "order") {
        this.db.applySyncedOrder(mutation.id, result.serverId);
      }
      this.bus.emit("sync:completed", { synced: 1, failed: 0, dead: 0 });
    } else {
      this.bus.emit("sync:completed", { synced: 0, failed: 1, dead: 0 });
    }

    return result;
  }

  /** Backoff: 2^k base delay (2s, 4s, 8s…) capped at `maxDelayMs`. */
  private scheduleRetry(attempts: number): void {
    const delay = Math.min(this.baseDelayMs * 2 ** (attempts - 1), this.maxDelayMs);
    const timer = setTimeout(() => {
      this.retryTimers.delete(timer);
      // If a flush is already running this is routed to `rerunPending` instead
      // of being dropped.
      void this.syncNow();
    }, delay);
    this.retryTimers.add(timer);
  }
}
