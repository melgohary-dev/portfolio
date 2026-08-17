import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import initSqlJs from "sql.js";
import type { SqlJsStatic } from "sql.js";
import {
  MemoryPersistence,
  OpfsPersistence,
  SqliteStorageProvider,
  createSqliteStorage,
  type PersistenceSink,
} from "../browser/storage-sqlite";
import { EventBus } from "../events";
import { MutationQueue } from "../mutation-queue";
import { DatabaseManager } from "../db-manager";
import type { CreateOrderInput } from "../types";

let sqlite: SqlJsStatic;

beforeAll(async () => {
  sqlite = await initSqlJs();
});

function makeProvider(bytes: Uint8Array | null = null) {
  const persistence = new MemoryPersistence();
  const provider = SqliteStorageProvider.fromBytes(sqlite, bytes, persistence);
  return { provider, persistence };
}

describe("SqliteStorageProvider", () => {
  it("returns null for a missing key", () => {
    const { provider } = makeProvider();
    expect(provider.get("nope")).toBeNull();
  });

  it("round-trips JSON values", () => {
    const { provider } = makeProvider();
    provider.set("order", { id: "ord_1", total: 10.5 });
    expect(provider.get<{ id: string; total: number }>("order")).toEqual({
      id: "ord_1",
      total: 10.5,
    });
  });

  it("returns null for corrupt JSON", () => {
    const seed = new sqlite.Database();
    seed.exec("CREATE TABLE kv (key TEXT PRIMARY KEY, value TEXT NOT NULL) WITHOUT ROWID");
    seed.exec("INSERT INTO kv VALUES ('bad', '{not json')");
    const { provider } = makeProvider(seed.export());
    seed.close();
    expect(provider.get("bad")).toBeNull();
  });

  it("overwrites an existing key", () => {
    const { provider } = makeProvider();
    provider.set("k", 1);
    provider.set("k", 2);
    expect(provider.get("k")).toBe(2);
  });

  it("removes keys", () => {
    const { provider } = makeProvider();
    provider.set("k", 1);
    provider.remove("k");
    expect(provider.get("k")).toBeNull();
  });

  it("clears all keys", () => {
    const { provider } = makeProvider();
    provider.set("a", 1);
    provider.set("b", 2);
    provider.clear();
    expect(provider.get("a")).toBeNull();
    expect(provider.get("b")).toBeNull();
  });

  it("round-trips large payloads", () => {
    const { provider } = makeProvider();
    const big = { rows: Array.from({ length: 10_000 }, (_, i) => ({ i, text: "x".repeat(50) })) };
    provider.set("bulk", big);
    expect(provider.get("bulk")).toEqual(big);
  });

  it("does not persist until flushed", async () => {
    const { provider, persistence } = makeProvider();
    provider.set("k", "in-memory-only");
    expect(await persistence.read()).toBeNull();
  });

  it("persists a snapshot on flush and reloads it into a new provider", async () => {
    const { provider, persistence } = makeProvider();
    provider.set("orders", [{ id: "ord_1" }]);
    await provider.flush();

    const reloaded = SqliteStorageProvider.fromBytes(sqlite, await persistence.read(), persistence);
    expect(reloaded.get<{ id: string }[]>("orders")).toEqual([{ id: "ord_1" }]);
  });

  it("auto-flushes after the debounce window", async () => {
    vi.useFakeTimers();
    try {
      const { provider, persistence } = makeProvider();
      provider.set("k", 1);
      await vi.advanceTimersByTimeAsync(250);
      expect(await persistence.read()).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the snapshot pending when a write fails and retries on the next flush", async () => {
    const persistence = new MemoryPersistence();
    let fail = true;
    const flaky: PersistenceSink = {
      async read() {
        return persistence.read();
      },
      async write(data: Uint8Array) {
        if (fail) throw new Error("disk full");
        await persistence.write(data);
      },
    };

    const provider = SqliteStorageProvider.fromBytes(sqlite, null, flaky);
    provider.set("k", 1);
    await expect(provider.flush()).rejects.toThrow("disk full");

    fail = false;
    await provider.flush();
    const reloaded = SqliteStorageProvider.fromBytes(sqlite, await persistence.read(), persistence);
    expect(reloaded.get("k")).toBe(1);
  });

  it("close flushes pending changes and makes the provider inert", async () => {
    const { provider, persistence } = makeProvider();
    provider.set("k", 1);
    await provider.close();

    expect(await persistence.read()).not.toBeNull();
    provider.set("k", 2);
    provider.remove("missing");
    expect(provider.get("k")).toBeNull();
  });

  it("survives many writes without losing the debounce schedule", async () => {
    vi.useFakeTimers();
    try {
      const { provider, persistence } = makeProvider();
      for (let i = 0; i < 50; i++) provider.set(`key-${i}`, i);
      provider.remove("key-0");
      provider.clear();
      provider.set("final", true);
      await vi.advanceTimersByTimeAsync(250);
      const reloaded = SqliteStorageProvider.fromBytes(
        sqlite,
        await persistence.read(),
        persistence,
      );
      expect(reloaded.get("final")).toBe(true);
      expect(reloaded.get("key-1")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("MemoryPersistence", () => {
  it("reads back exactly what was written", async () => {
    const persistence = new MemoryPersistence();
    expect(await persistence.read()).toBeNull();
    await persistence.write(new Uint8Array([1, 2, 3]));
    expect(Array.from((await persistence.read())!)).toEqual([1, 2, 3]);
  });

  it("does not alias the underlying buffer", async () => {
    const persistence = new MemoryPersistence();
    const data = new Uint8Array([9]);
    await persistence.write(data);
    data[0] = 42;
    expect(Array.from((await persistence.read())!)).toEqual([9]);
  });
});

describe("OpfsPersistence", () => {
  it("degrades to a no-op when OPFS is unavailable", async () => {
    // jsdom has no navigator.storage — both calls must resolve safely.
    const persistence = new OpfsPersistence();
    expect(await persistence.read()).toBeNull();
    await expect(persistence.write(new Uint8Array([1]))).resolves.toBeUndefined();
  });

  it("round-trips a snapshot through a real (stubbed) OPFS root", async () => {
    const { getStored } = stubOpfs();
    const persistence = new OpfsPersistence();

    await persistence.write(new Uint8Array([1, 2, 3]));
    expect(Array.from((await persistence.read())!)).toEqual([1, 2, 3]);
    expect(Array.from(getStored())).toEqual([1, 2, 3]);

    // A second provider re-reads the same persisted snapshot.
    const reopened = new OpfsPersistence();
    expect(Array.from((await reopened.read())!)).toEqual([1, 2, 3]);
  });

  it("treats an empty snapshot file as absent", async () => {
    stubOpfs();
    expect(await new OpfsPersistence().read()).toBeNull();
  });

  it("returns null when the underlying read fails", async () => {
    stubOpfs({ failGetFile: true });
    expect(await new OpfsPersistence().read()).toBeNull();
  });

  it("resolves quietly when the underlying write fails", async () => {
    stubOpfs({ failCreateWritable: true });
    await expect(new OpfsPersistence().write(new Uint8Array([1]))).resolves.toBeUndefined();
  });
});

/** Installs a minimal OPFS (FileSystemHandle-free) into the jsdom globals. */
function stubOpfs(options: { failGetFile?: boolean; failCreateWritable?: boolean } = {}) {
  let stored = new Uint8Array(0);
  const getStored = () => stored;

  const writable = {
    pending: new Uint8Array(0),
    async write(chunk: ArrayBuffer | Uint8Array) {
      this.pending = new Uint8Array(chunk);
    },
    async close() {
      stored = this.pending;
    },
  };

  const fileHandle = {
    async getFile() {
      if (options.failGetFile) throw new Error("read failure");
      return {
        size: stored.length,
        async arrayBuffer() {
          return stored.buffer.slice(0) as ArrayBuffer;
        },
      };
    },
    async createWritable() {
      if (options.failCreateWritable) throw new Error("write failure");
      return writable;
    },
  };

  const root = { async getFileHandle() { return fileHandle; } };
  vi.stubGlobal("navigator", {
    ...navigator,
    storage: { async getDirectory() { return root; } },
  });
  return { getStored };
}

describe("createSqliteStorage", () => {
  it("builds a working provider with the default (memory) sink in Node", async () => {
    const provider = await createSqliteStorage();
    provider.set("k", { nested: true });
    expect(provider.get("k")).toEqual({ nested: true });
    await provider.close();
  });

  it("reloads an existing snapshot from a custom sink", async () => {
    const persistence = new MemoryPersistence();
    const first = await createSqliteStorage({ persistence });
    first.set("orders", [{ id: "ord_1" }]);
    await first.close();

    const second = await createSqliteStorage({ persistence });
    expect(second.get<{ id: string }[]>("orders")).toEqual([{ id: "ord_1" }]);
    await second.close();
  });
});

// The same DatabaseManager scenarios from db-manager.test.ts, re-run against
// the SQLite-backed provider to prove the storage seam holds.
describe("DatabaseManager over SqliteStorageProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  function setup() {
    const { provider } = makeProvider();
    const bus = new EventBus();
    const queue = new MutationQueue(provider, bus);
    const db = new DatabaseManager(provider, queue, bus);
    return { provider, bus, queue, db };
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

  it("creates an order, persists it, and enqueues a matching mutation", () => {
    const { db, queue, bus } = setup();
    const listener = vi.fn();
    bus.on("order:created", listener);

    const order = db.createOrder(INPUT);

    expect(order.status).toBe("pending");
    expect(order.total).toBeCloseTo(43.47);
    expect(db.getOrders()).toHaveLength(1);
    expect(queue.pending()).toHaveLength(1);
    expect(queue.pending()[0].operation).toBe("create");
    expect(listener).toHaveBeenCalledWith({ orderId: order.id });
  });

  it("updates an order and supersedes its create mutation", () => {
    const { db, queue } = setup();
    const order = db.createOrder(INPUT);

    db.updateOrder(order.id, {
      lines: INPUT.lines,
      discount: { type: "fixed", value: 5 },
      taxes: [{ id: "vat", name: "VAT", kind: "vat", type: "percent", rate: 0.05 }],
      paymentMethod: "cash",
    });

    const mutations = queue.load();
    expect(mutations).toHaveLength(1);
    expect(mutations[0].operation).toBe("update");
  });

  it("applies a server id when the create syncs", () => {
    const { db, bus } = setup();
    const order = db.createOrder(INPUT);
    const listener = vi.fn();
    bus.on("order:synced", listener);

    db.applySyncedOrder(order.id, "svc_abc");

    expect(db.findOrder(order.id)?.status).toBe("synced");
    expect(db.findOrder(order.id)?.serverId).toBe("svc_abc");
    expect(listener).toHaveBeenCalledWith({ orderId: order.id, serverId: "svc_abc" });
  });

  it("retries a dead order and discards a dead order", () => {
    const { db, queue } = setup();
    const order = db.createOrder(INPUT);
    queue.markDead(order.id, "VALIDATION_FAILED");

    db.retryOrder(order.id);
    expect(db.findOrder(order.id)?.status).toBe("pending");
    expect(queue.pending()).toHaveLength(1);

    db.discardOrder(order.id);
    expect(queue.load()).toHaveLength(0);
    expect(db.findOrder(order.id)).toBeUndefined();
  });

  it("persists the whole core state to the SQLite snapshot", async () => {
    const { provider, db, queue } = setup();
    const order = db.createOrder(INPUT);
    db.applySyncedOrder(order.id, "svc_abc");
    queue.markSynced(order.id, "svc_abc");

    await provider.flush();

    const reloadedProvider = SqliteStorageProvider.fromBytes(
      sqlite,
      await provider.export(),
      new MemoryPersistence(),
    );
    const bus = new EventBus();
    const reloadedQueue = new MutationQueue(reloadedProvider, bus);
    const reloadedDb = new DatabaseManager(reloadedProvider, reloadedQueue, bus);

    const reloaded = reloadedDb.findOrder(order.id);
    expect(reloaded?.status).toBe("synced");
    expect(reloaded?.serverId).toBe("svc_abc");
    expect(reloadedQueue.load()).toHaveLength(1);
    expect(reloadedQueue.load()[0].status).toBe("synced");
  });
});
