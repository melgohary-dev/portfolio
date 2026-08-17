import type { Database, SqlJsStatic } from "sql.js";
import type { StorageProvider } from "../storage";

const KV_TABLE = "kv";
const KV_SCHEMA = `CREATE TABLE IF NOT EXISTS ${KV_TABLE} (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
) WITHOUT ROWID;`;

/**
 * Where the SQLite snapshot lives between sessions. The provider keeps the
 * working database in WASM memory and writes a full snapshot out on flush.
 */
export interface PersistenceSink {
  read(): Promise<Uint8Array | null>;
  write(data: Uint8Array): Promise<void>;
}

/** In-memory sink — used by tests, SSR, and as an OPFS fallback. */
export class MemoryPersistence implements PersistenceSink {
  private bytes: Uint8Array | null = null;

  async read(): Promise<Uint8Array | null> {
    return this.bytes ? new Uint8Array(this.bytes) : null;
  }

  async write(data: Uint8Array): Promise<void> {
    this.bytes = new Uint8Array(data);
  }
}

/**
 * Persists the snapshot to the Origin Private File System (`navigator.storage`
 * OPFS root). The real production backing store for the Qumra POS local DB —
 * durable, large, and never evicted like localStorage can be.
 *
 * When OPFS is unavailable (older browsers, some embedded webviews) every
 * call degrades to a safe no-op so the provider still works as a session-only
 * database.
 */
export class OpfsPersistence implements PersistenceSink {
  private fileHandle: FileSystemFileHandle | null = null;

  constructor(private readonly fileName = "offlinepos.sqlite") {}

  private async openFile(): Promise<FileSystemFileHandle | null> {
    if (this.fileHandle) return this.fileHandle;
    if (typeof navigator === "undefined") return null;
    const root = await navigator.storage?.getDirectory();
    if (!root) return null;
    this.fileHandle = await root.getFileHandle(this.fileName, { create: true });
    return this.fileHandle;
  }

  async read(): Promise<Uint8Array | null> {
    try {
      const handle = await this.openFile();
      if (!handle) return null;
      const file = await handle.getFile();
      if (file.size === 0) return null;
      return new Uint8Array(await file.arrayBuffer());
    } catch {
      return null;
    }
  }

  async write(data: Uint8Array): Promise<void> {
    try {
      const handle = await this.openFile();
      if (!handle) return;
      const writable = await handle.createWritable();
      const buffer = new ArrayBuffer(data.byteLength);
      new Uint8Array(buffer).set(data);
      await writable.write(buffer);
      await writable.close();
    } catch {
      // Persistence is best-effort; the in-memory DB stays authoritative.
    }
  }
}

/**
 * A `StorageProvider` backed by a real SQLite engine (sql.js WASM) instead of
 * localStorage. The public API stays synchronous — reads and writes hit the
 * in-memory WASM database immediately — while snapshots are persisted to a
 * `PersistenceSink` (OPFS in the browser) on a debounced timer.
 *
 * The whole core layer (DatabaseManager, MutationQueue, SyncEngine) only knows
 * about the `StorageProvider` interface, so swapping localStorage for SQLite
 * is just a different constructor argument.
 */
export class SqliteStorageProvider implements StorageProvider {
  private readonly db: Database;
  private dirty = false;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;

  private constructor(
    private readonly persistence: PersistenceSink,
    private readonly flushDelayMs: number,
    sqlite: SqlJsStatic,
    initialBytes: Uint8Array | null,
  ) {
    this.db = new sqlite.Database(initialBytes ? new Uint8Array(initialBytes) : undefined);
    this.db.exec(KV_SCHEMA);
  }

  /**
   * Synchronous construction from an already-initialized sql.js module. Tests
   * and callers that have the WASM engine loaded use this directly; the async
   * `createSqliteStorage()` handles loading it.
   */
  static fromBytes(
    sqlite: SqlJsStatic,
    initialBytes: Uint8Array | null,
    persistence: PersistenceSink,
    flushDelayMs = 250,
  ): SqliteStorageProvider {
    return new SqliteStorageProvider(persistence, flushDelayMs, sqlite, initialBytes);
  }

  get<T>(key: string): T | null {
    if (this.closed) return null;
    const stmt = this.db.prepare(`SELECT value FROM ${KV_TABLE} WHERE key = ?`);
    try {
      stmt.bind([key]);
      if (!stmt.step()) return null;
      const raw = stmt.getAsObject().value as string;
      return this.parse<T>(raw);
    } finally {
      stmt.free();
    }
  }

  set<T>(key: string, value: T): void {
    if (this.closed) return;
    const stmt = this.db.prepare(
      `INSERT INTO ${KV_TABLE} (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    );
    try {
      stmt.run([key, JSON.stringify(value)]);
    } finally {
      stmt.free();
    }
    this.markDirty();
  }

  remove(key: string): void {
    if (this.closed) return;
    this.db.exec(`DELETE FROM ${KV_TABLE} WHERE key = ?`, [key]);
    this.markDirty();
  }

  clear(): void {
    if (this.closed) return;
    this.db.exec(`DELETE FROM ${KV_TABLE}`);
    this.markDirty();
  }

  /** Export the current database state to bytes (snapshot / migration). */
  export(): Uint8Array {
    return this.db.export();
  }

  /** Push any pending changes to the persistence sink immediately. */
  async flush(): Promise<void> {
    if (this.closed) return;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (!this.dirty) return;
    const bytes = this.db.export();
    this.dirty = false;
    try {
      await this.persistence.write(bytes);
    } catch (error) {
      this.dirty = true; // keep the snapshot pending so a later flush retries
      throw error;
    }
  }

  /** Flush pending changes and release the WASM database. */
  async close(): Promise<void> {
    if (this.closed) return;
    await this.flush();
    this.closed = true;
    this.db.close();
  }

  /** Debounced snapshot write — the timer resets on every write, so a burst of orders triggers one flush. */
  private markDirty(): void {
    if (this.dirty) return;
    this.dirty = true;
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      void this.flush().catch(() => undefined);
    }, this.flushDelayMs);
  }

  private parse<T>(raw: string): T | null {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
}

/**
 * Async factory used by the app: loads the SQLite WASM engine, opens the
 * persisted snapshot, and hands back a fully working provider.
 */
export async function createSqliteStorage(
  options: {
    persistence?: PersistenceSink;
    flushDelayMs?: number;
  } = {},
): Promise<SqliteStorageProvider> {
  const sqlite = await loadSqlJs();
  const persistence = options.persistence ?? defaultPersistence();
  const bytes = await persistence.read();
  return SqliteStorageProvider.fromBytes(sqlite, bytes, persistence, options.flushDelayMs);
}

async function loadSqlJs(): Promise<SqlJsStatic> {
  const initSqlJs = (await import("sql.js")).default;
  if (isBrowser()) {
    // In the browser, Vite hands us the WASM binary as an asset URL instead of
    // relying on emscripten's script-sibling lookup, which bundlers break.
    const wasmUrl = (await import("sql.js/dist/sql-wasm-browser.wasm?url")).default;
    return initSqlJs({ locateFile: () => wasmUrl });
  }
  return initSqlJs();
}

function isBrowser(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (globalThis as { process?: unknown }).process === "undefined"
  );
}

function defaultPersistence(): PersistenceSink {
  if (typeof navigator !== "undefined" && typeof navigator.storage?.getDirectory === "function") {
    return new OpfsPersistence();
  }
  return new MemoryPersistence();
}
