import { useEffect } from "react";
import { bus, queue, sync } from "@offlinepos/core/browser";
import { startTabSync } from "../lib/tab-sync";
import { useNetworkStore } from "../store/network";
import { useSyncStore } from "../store/sync";

function refreshCounts() {
  useSyncStore.getState().setPending(queue.pending().length);
  useSyncStore.getState().setDead(queue.byStatus("dead").length);
}

/**
 * Wires the sync engine + event bus into reactive stores so the UI can show
 * online status, pending/dead mutation counts, and live sync reports.
 * Also mirrors the manual network toggle back onto the engine.
 */
export function useSyncLifecycle(): void {
  const online = useNetworkStore((state) => state.online);

  useEffect(() => {
    // `sync.start()` is idempotent (guarded internally), so it is safe to call
    // on every effect run. This keeps the enqueue listener bound across React
    // StrictMode's mount → unmount → remount cycle, otherwise a new local
    // order would only sync after a reload or network flip.
    sync.start();
    refreshCounts();

    // BroadcastChannel + storage-event coordination so every open tab reacts
    // to orders, parks and sync events made in the other tabs.
    const stopTabSync = startTabSync();

    const offEnqueued = bus.on("mutation:enqueued", () => refreshCounts());
    const offStarted = bus.on("sync:started", () => {
      useSyncStore.getState().setSyncing(true);
      useSyncStore.getState().setLastEvent("sync:started");
    });
    const offCompleted = bus.on("sync:completed", (report) => {
      useSyncStore.getState().setSyncing(false);
      useSyncStore.getState().setLastSummary(report);
      useSyncStore.getState().setLastEvent(
        `synced ${report.synced} · failed ${report.failed} · dead ${report.dead}`,
      );
      refreshCounts();
    });
    const offOrderSynced = bus.on("order:synced", () => refreshCounts());

    return () => {
      stopTabSync();
      offEnqueued();
      offStarted();
      offCompleted();
      offOrderSynced();
      sync.stop();
    };
  }, []);

  // Reflect toggles / navigator.onLine changes onto the engine immediately.
  useEffect(() => {
    if (online) {
      sync.start(); // idempotent — re-binds the enqueued-mutation listener.
      void sync.syncNow();
    } else {
      sync.stop();
    }
  }, [online]);

  // Keep the network store in sync with the browser's *real* connectivity
  // (DevTools offline toggle, dropped wifi, etc.) so the sidebar status card
  // and the sync loop react to actual network changes, not just the manual
  // simulate-offline button.
  useEffect(() => {
    const goOnline = () => useNetworkStore.getState().setOnline(true);
    const goOffline = () => useNetworkStore.getState().setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);
}
