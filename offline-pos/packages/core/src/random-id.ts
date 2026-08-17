/**
 * A collision-resistant id generator that works on every platform.
 *
 * Prefers `globalThis.crypto.randomUUID` (browser, Node 18+, Hermes/RN) and
 * falls back to a time+random mix so the engine never depends on DOM types
 * — keeping `@offlinepos/core` typecheckable without a DOM lib.
 */
export function randomId(prefix: string): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return `${prefix}_${c.randomUUID()}`;
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
