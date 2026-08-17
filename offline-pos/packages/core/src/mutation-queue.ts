import type { EventBus } from "./events";
import type { StorageProvider } from "./storage";
import { randomId } from "./random-id";

export type MutationOperation = "create" | "update" | "delete";
export type MutationStatus = "pending" | "synced" | "dead";

export interface Mutation {
  id: string;
  entity: string;
  operation: MutationOperation;
  payload: Record<string, unknown>;
  createdAt: number;
  status: MutationStatus;
  attempts: number;
  serverId?: string;
  error?: string;
}

/**
 * The outbox pattern, made local.
 *
 * Every write the cashier makes is appended here *first*, then the sync
 * engine replays the queue to the server. This guarantees the order exists
 * locally the moment it is placed — the network can disappear and the
 * checkout still completes. Retries use exponential backoff; mutations that
 * can never succeed are marked "dead" and surfaced in the UI instead of
 * being retried forever.
 */
export class MutationQueue {
  private key = "offlinepos:mutation-queue";

  constructor(
    private storage: StorageProvider,
    private bus: EventBus,
  ) {}

  load(): Mutation[] {
    return this.storage.get<Mutation[]>(this.key) ?? [];
  }

  /**
   * Append a mutation to the outbox. When no id is given one is generated.
   * Mutations are appended, never de-duplicated: "update supersedes create" is
   * handled one level up (`DatabaseManager.updateOrder` removes the old
   * mutation before enqueueing the new one), so the queue itself can stay dumb.
   */
  enqueue(input: {
    id?: string;
    entity: string;
    operation: MutationOperation;
    payload: Record<string, unknown>;
  }): Mutation {
    const mutation: Mutation = {
      id: input.id ?? randomId("mut"),
      entity: input.entity,
      operation: input.operation,
      payload: input.payload,
      createdAt: Date.now(),
      status: "pending",
      attempts: 0,
    };
    this.persist([...this.load(), mutation]);
    this.bus.emit("mutation:enqueued", { mutationId: mutation.id });
    return mutation;
  }

  pending(): Mutation[] {
    return this.load().filter((m) => m.status === "pending");
  }

  byStatus(status: MutationStatus): Mutation[] {
    return this.load().filter((m) => m.status === status);
  }

  bumpAttempt(id: string, error: string): number {
    const all = this.load();
    const mutation = all.find((m) => m.id === id);
    if (!mutation) return 0;
    mutation.attempts += 1;
    mutation.error = error;
    this.persist(all);
    return mutation.attempts;
  }

  markSynced(id: string, serverId: string): void {
    const all = this.load();
    const mutation = all.find((m) => m.id === id);
    if (!mutation) return;
    mutation.status = "synced";
    mutation.serverId = serverId;
    mutation.error = undefined;
    this.persist(all);
  }

  markDead(id: string, error: string): void {
    const all = this.load();
    const mutation = all.find((m) => m.id === id);
    if (!mutation) return;
    mutation.status = "dead";
    mutation.error = error;
    this.persist(all);
  }

  /**
   * Reset a dead mutation back to pending and re-trigger a sync flush. The
   * cashier uses this when a retry could plausibly succeed (e.g. the error
   * was transient or the payload was fixed by re-editing the order).
   */
  retry(id: string): Mutation | null {
    const all = this.load();
    const mutation = all.find((m) => m.id === id);
    if (!mutation || mutation.status !== "dead") return null;
    mutation.status = "pending";
    mutation.attempts = 0;
    mutation.error = undefined;
    this.persist(all);
    this.bus.emit("mutation:enqueued", { mutationId: mutation.id });
    return mutation;
  }

  /** Drop a mutation whatever its status — used when an update supersedes a create or an order is discarded. */
  remove(id: string): void {
    this.persist(this.load().filter((m) => m.id !== id));
  }

  /**
   * Housekeeping: drop synced/dead mutations older than `keepMs`. Pending
   * mutations are NEVER pruned — they are the only record of an un-replicated
   * sale and must survive until the server confirms them.
   */
  prune(keepMs = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - keepMs;
    const all = this.load();
    const kept = all.filter(
      (m) => m.status === "pending" || m.createdAt > cutoff,
    );
    this.persist(kept);
    return all.length - kept.length;
  }

  private persist(mutations: Mutation[]): void {
    this.storage.set(this.key, mutations);
  }
}
