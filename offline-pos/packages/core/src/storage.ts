/**
 * The one storage seam the whole engine sits on.
 *
 * Contract: synchronous, JSON-serializable values only, and every `get`
 * returns a freshly-parsed copy — callers may mutate a result freely without
 * writing back. Implementations: `MemoryStorageProvider` (tests/SSR),
 * `LocalStorageProvider` (browser demo), `SqliteStorageProvider` (OPFS, for
 * production) and `AsyncStorage` on React Native.
 */
export interface StorageProvider {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
}

/**
 * In-memory provider, used by tests and SSR. The browser's `localStorage`
 * implementation lives in `@offlinepos/core/browser` (`LocalStorageProvider`);
 * mobile apps implement the same seam with `AsyncStorage`.
 */
export class MemoryStorageProvider implements StorageProvider {
  private store = new Map<string, string>();

  get<T>(key: string): T | null {
    const raw = this.store.get(key);
    if (raw === undefined) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    this.store.set(key, JSON.stringify(value));
  }

  remove(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}
