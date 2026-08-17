import { useEffect } from "react";
import { useLocaleStore } from "../i18n";
import { useThemeStore } from "../store/theme";

/**
 * Applies the persisted locale (lang + dir) and theme (`.dark` class) to
 * <html> on mount and whenever they change.
 */
export function useDocumentSettings() {
  const locale = useLocaleStore((s) => s.locale);
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);
}
