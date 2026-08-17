import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StorageProvider } from "@offlinepos/core";

/**
 * A synchronous `StorageProvider` backed by AsyncStorage.
 *
 * The core engine's contract is synchronous (localStorage-shaped), but
 * AsyncStorage is async. This provider keeps an in-memory cache, hydrates it
 * once at startup, and flushes writes back with a debounce — so the whole
 * shared engine (`db`, `queue`, `sync`, `printer` settings) runs unchanged
 * on-device.
 */
export class NativeStorageProvider implements StorageProvider {
  private cache = new Map<string, string>();
  private hydrated = false;
  private dirty = false;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly flushMs = 300) {}

  async hydrate(): Promise<void> {
    if (this.hydrated) return;
    const keys = await AsyncStorage.getAllKeys();
    const pairs = await AsyncStorage.multiGet(keys);
    for (const [key, value] of pairs) {
      if (value != null) this.cache.set(key, value);
    }
    this.hydrated = true;
  }

  get<T>(key: string): T | null {
    const raw = this.cache.get(key);
    if (raw === undefined) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    this.cache.set(key, JSON.stringify(value));
    this.scheduleFlush();
  }

  remove(key: string): void {
    this.cache.delete(key);
    this.scheduleFlush();
  }

  clear(): void {
    this.cache.clear();
    this.scheduleFlush();
  }

  /** Wait until all pending writes are persisted to AsyncStorage. */
  async flush(): Promise<void> {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (!this.dirty) return;
    this.dirty = false;
    await AsyncStorage.multiSet([...this.cache.entries()]);
  }

  private scheduleFlush(): void {
    this.dirty = true;
    if (this.flushTimer !== null) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, this.flushMs);
  }
}
