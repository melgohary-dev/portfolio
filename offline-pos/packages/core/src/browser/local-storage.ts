import type { StorageProvider } from "../storage";

/**
 * Persists the "local database" to the browser's localStorage.
 *
 * In the production version of this architecture (Qumra POS) the same
 * provider interface is implemented with SQLite/WASM backed by IndexedDB.
 * Keeping the seam small means the storage engine is swappable — that is
 * the whole point of the abstraction.
 */
export class LocalStorageProvider implements StorageProvider {
  get<T>(key: string): T | null {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  /**
   * `setItem` can throw (quota exceeded, private-mode blocked storage). The
   * engine does not guard every call — in the demo a throw surfaces loudly in
   * devtools, which is the intent. The SQLite provider used in production is
   * not subject to localStorage's 5–10 MB quota.
   */
  set<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  remove(key: string): void {
    localStorage.removeItem(key);
  }

  clear(): void {
    localStorage.clear();
  }
}
