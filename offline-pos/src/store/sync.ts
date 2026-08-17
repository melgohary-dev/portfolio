import { create } from "zustand";

export interface SyncSummary {
  synced: number;
  failed: number;
  dead: number;
}

interface SyncState {
  syncing: boolean;
  pending: number;
  dead: number;
  lastSummary: SyncSummary | null;
  lastEvent: string | null;
  setSyncing: (syncing: boolean) => void;
  setPending: (pending: number) => void;
  setDead: (dead: number) => void;
  setLastSummary: (summary: SyncSummary) => void;
  setLastEvent: (event: string) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  syncing: false,
  pending: 0,
  dead: 0,
  lastSummary: null,
  lastEvent: null,
  setSyncing: (syncing) => set({ syncing }),
  setPending: (pending) => set({ pending }),
  setDead: (dead) => set({ dead }),
  setLastSummary: (lastSummary) => set({ lastSummary }),
  setLastEvent: (lastEvent) => set({ lastEvent }),
}));
