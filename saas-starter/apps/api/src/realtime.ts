type StreamEntry = {
  tenantId: string;
  enqueue: (chunk: string) => void;
  signal: AbortSignal;
};

const connections = new Map<string, Set<StreamEntry>>();

/**
 * Registers a tenant's SSE connection. Single-process in-memory fan-out — the
 * component owns that contract: with multiple API replicas behind a load
 * balancer only the instance that created the order will broadcast it. Use a
 * pub/sub broker (Redis) when scaling horizontally.
 */
export function subscribeToOrders(
  tenantId: string,
  enqueue: (chunk: string) => void,
  signal: AbortSignal,
): () => void {
  const entry: StreamEntry = { tenantId, enqueue, signal };
  const set = connections.get(tenantId) ?? new Set<StreamEntry>();
  set.add(entry);
  connections.set(tenantId, set);
  return () => {
    set.delete(entry);
    if (set.size === 0) {
      connections.delete(tenantId);
    }
  };
}

export function publishOrderEvent(tenantId: string, event: { type: string; order: unknown }) {
  const set = connections.get(tenantId);
  if (!set) {
    return;
  }
  const chunk = `event: ${event.type}\ndata: ${JSON.stringify(event.order)}\n\n`;
  for (const entry of [...set]) {
    if (entry.signal.aborted) {
      set.delete(entry);
      continue;
    }
    try {
      entry.enqueue(chunk);
    } catch {
      // A closed/errored SSE stream throws on enqueue — drop the connection so
      // a single dead client cannot crash the publish loop.
      set.delete(entry);
    }
  }
  if (set.size === 0) {
    connections.delete(tenantId);
  }
}
