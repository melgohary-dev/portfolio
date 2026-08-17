import type { Mutation } from "./mutation-queue";
import type { SyncResult } from "./sync-engine";

export interface MockServerOptions {
  /** Probability a create/update fails transiently (0..1). */
  transientFailureRate?: number;
  /** Probability a failure is permanent/validation (0..1 of failures). */
  permanentRate?: number;
  latencyMs?: [number, number];
  /** When true, every call succeeds. Useful for demos/tests. */
  alwaysOk?: boolean;
}

/**
 * A stand-in for the real GraphQL backend. It validates payloads, issues
 * server IDs, and can be tuned to fail so you can watch the sync engine
 * back off, retry, and (for bad payloads) park the mutation as "dead".
 *
 * In the production Qumra POS this is a `createPosOrder` GraphQL mutation;
 * the rest of the code does not care about the difference.
 */
export class MockServer {
  private transientFailureRate: number;
  private permanentRate: number;
  private latencyMs: [number, number];
  private alwaysOk: boolean;
  private seq = 0;

  constructor(options: MockServerOptions = {}) {
    this.transientFailureRate = options.transientFailureRate ?? 0.15;
    this.permanentRate = options.permanentRate ?? 0.1;
    this.latencyMs = options.latencyMs ?? [120, 420];
    this.alwaysOk = options.alwaysOk ?? false;
  }

  /**
   * The server's mirror of committed orders, keyed by the client's temporary
   * id. A later edit to the same temp id with a *different* total is a
   * conflict — the server already confirmed the sale at the old amount.
   */
  private records = new Map<string, { total: number; serverId: string }>();

  async sync(mutation: Mutation, force = false): Promise<SyncResult> {
    await this.simulateLatency();
    return this.handle(mutation, force);
  }

  private handle(mutation: Mutation, force: boolean): SyncResult {
    // A forced push means the cashier asserts the local copy is authoritative:
    // the server overwrites its stored record with the client's exact payload.
    if (force) {
      return { ok: true, serverId: this.commit(mutation).serverId };
    }

    if (this.alwaysOk) {
      return { ok: true, serverId: this.commit(mutation).serverId };
    }

    if (mutation.entity === "order") {
      const existing = this.records.get(mutation.id);
      const total = (mutation.payload as { total?: number }).total;
      if (existing && existing.total !== total) {
        return {
          ok: false,
          error: "CONFLICT: server already has a different version",
          permanent: true,
        };
      }

      // Validate the payload — a malformed order is a permanent failure.
      const lines = (mutation.payload as { lines?: unknown[] }).lines;
      if (!Array.isArray(lines) || lines.length === 0) {
        return {
          ok: false,
          error: "VALIDATION_FAILED: order has no lines",
          permanent: true,
        };
      }
      if (typeof total !== "number" || total <= 0) {
        return {
          ok: false,
          error: "VALIDATION_FAILED: total must be positive",
          permanent: true,
        };
      }
    }

    if (Math.random() < this.transientFailureRate) {
      return Math.random() < this.permanentRate
        ? { ok: false, error: "INTERNAL_ERROR: order id conflict", permanent: true }
        : { ok: false, error: "NETWORK_ERROR: connection reset", permanent: false };
    }

    return { ok: true, serverId: this.commit(mutation).serverId };
  }

  /** Stores the committed payload and returns the canonical record. */
  private commit(mutation: Mutation): { total: number; serverId: string } {
    const total = (mutation.payload as { total?: number }).total ?? 0;
    const existing = this.records.get(mutation.id);
    const record = { total, serverId: existing?.serverId ?? this.nextServerId() };
    this.records.set(mutation.id, record);
    return record;
  }

  private nextServerId(): string {
    this.seq += 1;
    return `svc_${Date.now()}_${this.seq}`;
  }

  private simulateLatency(): Promise<void> {
    const [min, max] = this.latencyMs;
    const ms = min + Math.random() * (max - min);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
