import { describe, it, expect } from "vitest";
import { MockServer } from "../mock-server";
import type { Mutation } from "../mutation-queue";

function mutation(overrides: Partial<Mutation> = {}): Mutation {
  return {
    id: "ord_1",
    entity: "order",
    operation: "create",
    payload: {
      id: "ord_1",
      lines: [{ productId: "p1", name: "Latte", price: 15, quantity: 1, lineTotal: 15 }],
      total: 15,
    },
    createdAt: 1,
    status: "pending",
    attempts: 0,
    ...overrides,
  };
}

describe("MockServer", () => {
  it("always succeeds when alwaysOk", async () => {
    const server = new MockServer({ alwaysOk: true, latencyMs: [0, 0] });
    const result = await server.sync(mutation());
    expect(result).toEqual({ ok: true, serverId: expect.stringMatching(/^svc_/) });
  });

  it("rejects an order with no lines as a permanent failure", async () => {
    const server = new MockServer({ transientFailureRate: 0, permanentRate: 0, latencyMs: [0, 0] });
    const result = await server.sync(mutation({ payload: { lines: [], total: 15 } }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.permanent).toBe(true);
  });

  it("rejects an order with a non-positive total as a permanent failure", async () => {
    const server = new MockServer({ transientFailureRate: 0, permanentRate: 0, latencyMs: [0, 0] });
    const result = await server.sync(mutation({ payload: { lines: [{ lineTotal: 0 }], total: 0 } }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("total must be positive");
  });

  it("can be tuned to fail permanently", async () => {
    const server = new MockServer({ transientFailureRate: 1, permanentRate: 1, latencyMs: [0, 0] });
    const result = await server.sync(mutation());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.permanent).toBe(true);
  });

  it("can be tuned to fail transiently", async () => {
    const server = new MockServer({ transientFailureRate: 1, permanentRate: 0, latencyMs: [0, 0] });
    const result = await server.sync(mutation());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.permanent).toBe(false);
  });

  it("issues unique server ids for distinct orders and dedupes by client id", async () => {
    const server = new MockServer({ alwaysOk: true, latencyMs: [0, 0] });
    const a = await server.sync(mutation());
    const b = await server.sync(mutation({ id: "ord_2" }));
    expect(a.ok && b.ok ? a.serverId : null).not.toBe(b.ok ? b.serverId : null);
    // Re-syncing the same client id is idempotent — it returns the same record.
    const dup = await server.sync(mutation());
    expect(a.ok && dup.ok ? a.serverId : null).toBe(dup.ok ? dup.serverId : null);
  });

  it("keeps the same server id when an order is edited", async () => {
    const server = new MockServer({ transientFailureRate: 0, permanentRate: 0, latencyMs: [0, 0] });
    const created = await server.sync(mutation());
    expect(created.ok).toBe(true);
    const firstId = created.ok ? created.serverId : null;

    const edited = await server.sync(mutation({ operation: "update" }));
    expect(edited.ok).toBe(true);
    expect(edited.ok ? edited.serverId : null).toBe(firstId);
  });

  it("rejects an edit whose total differs from the stored record as a conflict", async () => {
    const server = new MockServer({ transientFailureRate: 0, permanentRate: 0, latencyMs: [0, 0] });
    await server.sync(mutation());

    const result = await server.sync(mutation({ operation: "update", payload: { lines: [{ lineTotal: 20 }], total: 20 } }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.permanent).toBe(true);
      expect(result.error).toContain("CONFLICT");
    }
  });

  it("force-push overwrites a conflicting record and keeps the server id", async () => {
    const server = new MockServer({ transientFailureRate: 0, permanentRate: 0, latencyMs: [0, 0] });
    const created = await server.sync(mutation());
    const firstId = created.ok ? created.serverId : null;

    const conflict = await server.sync(mutation({ operation: "update", payload: { lines: [{ lineTotal: 20 }], total: 20 } }));
    expect(conflict.ok).toBe(false);

    const forced = await server.sync(mutation({ operation: "update", payload: { lines: [{ lineTotal: 20 }], total: 20 } }), true);
    expect(forced.ok).toBe(true);
    if (forced.ok) {
      expect(forced.serverId).toBe(firstId);
      // The overwritten record is now the local version, so a retry no longer conflicts.
      const retry = await server.sync(mutation({ operation: "update", payload: { lines: [{ lineTotal: 20 }], total: 20 } }));
      expect(retry.ok).toBe(true);
    }
  });

  it("force-push accepts a payload even when validation would reject it", async () => {
    const server = new MockServer({ transientFailureRate: 0, permanentRate: 0, latencyMs: [0, 0] });
    const invalid = mutation({ payload: { lines: [], total: 0 } });
    expect((await server.sync(invalid)).ok).toBe(false);

    const forced = await server.sync(invalid, true);
    expect(forced.ok).toBe(true);
  });
});
