import {
  DatabaseManager,
  EventBus,
  MemoryReceiptPrinter,
  MockServer,
  MutationQueue,
  PrinterManager,
  SyncEngine,
} from "@offlinepos/core";
import { NativeStorageProvider } from "./storage";

/**
 * Native wiring for the mobile client — composes the platform-neutral core
 * exactly like the web app's browser wiring, but with AsyncStorage instead of
 * localStorage and the demo printer instead of Web Serial. Everything else
 * (orders, mutation queue, sync engine, receipts) is the same shared code.
 */
export const storage = new NativeStorageProvider();
export const bus = new EventBus();
export const queue = new MutationQueue(storage, bus);
export const db = new DatabaseManager(storage, queue, bus);
export const server = new MockServer();
export const sync = new SyncEngine({
  queue,
  db,
  bus,
  syncFn: server.sync.bind(server),
  // The demo server is local, so the phone is always "online" to it. A real
  // client would feed connectivity here (e.g. NetInfo.isConnected).
  isOnline: () => true,
  baseDelayMs: 2000,
  maxDelayMs: 30_000,
  maxAttempts: 4,
});
export const printer = new PrinterManager(storage, bus, new MemoryReceiptPrinter());

/** Hydrate persisted state and seed the catalog on first launch. */
export async function initApp(products: Parameters<typeof db.upsertProducts>[0]): Promise<void> {
  await storage.hydrate();
  if (db.getProducts().length === 0) {
    db.upsertProducts(products);
  }
}
