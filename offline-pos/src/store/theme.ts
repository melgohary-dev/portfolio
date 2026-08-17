import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
}

/**
 * Class-based dark mode. The `.dark` class is toggled on <html> and Tailwind's
 * `dark:` variant (custom-variant, see index.css) resolves against it.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "light",
      toggleTheme: () => set({ theme: get().theme === "light" ? "dark" : "light" }),
    }),
    { name: "offlinepos:theme" },
  ),
);
