import { DatabaseManager } from "../db-manager";
import { EventBus } from "../events";
import { MockServer } from "../mock-server";
import { MutationQueue } from "../mutation-queue";
import { PrinterManager } from "../printer";
import { SyncEngine } from "../sync-engine";
import { LocalStorageProvider } from "./local-storage";

/**
 * Browser wiring for the demo — composes the platform-neutral core with
 * browser storage, a fake server and `navigator.onLine`. In production each
 * app composes its own instances so tests and multiple stores stay isolated
 * (mobile does the same with `AsyncStorage` instead of `localStorage`).
 *
 * Upgrade path: the demo's `LocalStorageProvider` has a 5–10 MB quota, which
 * is plenty for receipts but not for a long-lived catalog/photo history.
 * `SqliteStorageProvider` (OPFS-backed, see `./storage-sqlite`) implements the
 * same `StorageProvider` contract, so swapping storage in is a one-line change
 * here plus seeding the existing keys into it on first run.
 */
export const bus = new EventBus();
export const storage = new LocalStorageProvider();
export const queue = new MutationQueue(storage, bus);
export const db = new DatabaseManager(storage, queue, bus);
export const server = new MockServer();
export const sync = new SyncEngine({
  queue,
  db,
  bus,
  syncFn: server.sync.bind(server),
  isOnline: () => navigator.onLine,
  baseDelayMs: 2000,
  maxDelayMs: 30_000,
  maxAttempts: 4,
});
export const printer = new PrinterManager(storage, bus);

export * from "../index";
export { LocalStorageProvider } from "./local-storage";
export { WebSerialReceiptPrinter } from "./web-serial-printer";
export {
  MemoryPersistence,
  OpfsPersistence,
  SqliteStorageProvider,
  createSqliteStorage,
  type PersistenceSink,
} from "./storage-sqlite";
