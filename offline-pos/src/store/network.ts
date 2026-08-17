import { create } from "zustand";

interface NetworkState {
  online: boolean;
  setOnline: (online: boolean) => void;
  toggle: () => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  online: navigator.onLine,
  setOnline: (online) => set({ online }),
  // Simulation of going offline for demos: the toggle flips the flag, but a
  // real `online`/`offline` browser event overrides it (see useSyncLifecycle).
  toggle: () => set((state) => ({ online: !state.online })),
}));
