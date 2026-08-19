"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Aggregation, GridQuery, Incoming, Outgoing } from "@/lib/orders-worker";

export interface AggregationState {
  /** Result of the latest completed pass (stale responses are dropped). */
  aggregation: Aggregation | null;
  /** Wall time of the latest pass, in milliseconds. */
  ms: number | null;
  /** True while a pass is in flight. */
  computing: boolean;
  /** True if the worker failed or returned an error envelope for the latest request. */
  error: boolean;
  /** Shared worker instance, always current after mount. */
  workerRef: React.RefObject<Worker | null>;
  /** Send a new aggregation pass for the given filter predicate. */
  aggregate: (query: GridQuery) => void;
}

// --- Shared worker (module-scoped singleton) -----------------------------
//
// Every mount of this hook used to spin up its own worker and structured-clone
// the full 120k dataset into it (serialization happens on the *calling*
// thread, blocking the UI for hundreds of ms at mount and on every
// re-aggregation). The worker now builds its own dataset from the same seeded
// generator, so the main thread only ever sends a small predicate object.
//
// To avoid one worker per route mount (and the teardown/re-clone churn of the
// PageTransition remount), the worker is shared: the first caller creates it,
// callers subscribe, and the last caller to release terminates it.

let sharedWorker: Worker | null = null;
let refCount = 0;

/** Monotonic across all hook instances so two hooks can never collide on ids. */
let nextReqId = 0;

const errorListeners = new Set<() => void>();

const EMPTY_QUERY: GridQuery = {
  search: "",
  status: "all",
  region: "all",
  statusOverrides: {},
};

function notifyWorkerError() {
  errorListeners.forEach((listener) => listener());
}

function acquireWorker(): Worker {
  if (!sharedWorker) {
    sharedWorker = new Worker(
      new URL("@/lib/orders-worker.ts", import.meta.url),
      { type: "module" },
    );
    sharedWorker.onerror = () => notifyWorkerError();
    sharedWorker.onmessageerror = () => notifyWorkerError();
  }
  refCount++;
  return sharedWorker;
}

function releaseWorker(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && sharedWorker) {
    sharedWorker.terminate();
    sharedWorker = null;
  }
}

function subscribeErrors(listener: () => void): () => void {
  errorListeners.add(listener);
  return () => {
    errorListeners.delete(listener);
  };
}

/**
 * Owns access to the shared orders-aggregation worker. On mount it runs one
 * pass over the full dataset (the dashboard + grid both show these whole-
 * picture numbers), then `aggregate(query)` re-runs the pass against any
 * filtered/edited subset — debounced by the caller. Requests carry a globally
 * unique request id; responses whose id no longer matches the latest request
 * are dropped so fast typing never shows out-of-date totals.
 */
export function useOrdersAggregation(): AggregationState {
  const workerRef = useRef<Worker | null>(null);
  const reqRef = useRef(-1);
  const [aggregation, setAggregation] = useState<Aggregation | null>(null);
  const [ms, setMs] = useState<number | null>(null);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const worker = acquireWorker();
    workerRef.current = worker;

    const onMessage = (e: MessageEvent<Outgoing>) => {
      const data = e.data;
      if (!data) return;
      if (data.action === "error") {
        if (data.reqId === reqRef.current) {
          setComputing(false);
          setError(true);
        }
        return;
      }
      if (data.action !== "aggregate") return;
      if (data.reqId !== reqRef.current) return; // stale response
      setAggregation(data.result);
      setMs(data.ms);
      setComputing(false);
      setError(false);
    };
    worker.addEventListener("message", onMessage);
    const unsubscribe = subscribeErrors(() => {
      setComputing(false);
      setError(true);
    });

    // Full-dataset pass on mount.
    const reqId = ++nextReqId;
    reqRef.current = reqId;
    worker.postMessage({ action: "aggregate", query: EMPTY_QUERY, reqId } satisfies Incoming);

    return () => {
      worker.removeEventListener("message", onMessage);
      unsubscribe();
      workerRef.current = null;
      releaseWorker();
    };
  }, []);

  const aggregate = useCallback((query: GridQuery) => {
    const worker = workerRef.current;
    if (!worker) return;
    const reqId = ++nextReqId;
    reqRef.current = reqId;
    setComputing(true);
    setError(false);
    try {
      worker.postMessage({ action: "aggregate", query, reqId } satisfies Incoming);
    } catch {
      // Terminated worker (e.g. mid-route-change) throws synchronously — never
      // leave `computing` wedged.
      setComputing(false);
      setError(true);
    }
  }, []);

  return { aggregation, ms, computing, error, workerRef, aggregate };
}
