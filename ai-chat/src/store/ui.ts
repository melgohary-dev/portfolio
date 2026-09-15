import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProviderId } from "../lib/providers/types";

interface UiState {
  darkMode: boolean;
  provider: ProviderId;
  sidebarOpen: boolean;
  setDarkMode: (dark: boolean) => void;
  toggleDarkMode: () => void;
  setProvider: (provider: ProviderId) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  initTheme: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      darkMode: false,
      provider: "mock",
      sidebarOpen: false,

      setDarkMode: (dark) => {
        set({ darkMode: dark });
        document.documentElement.classList.toggle("dark", dark);
      },

      toggleDarkMode: () => get().setDarkMode(!get().darkMode),

      setProvider: (provider) => set({ provider }),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      initTheme: () => {
        const { darkMode } = get();
        document.documentElement.classList.toggle("dark", darkMode);
      },
    }),
    {
      name: "ai-chat:ui",
      version: 1,
    },
  ),
);
