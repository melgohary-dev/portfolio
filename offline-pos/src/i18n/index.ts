import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useMemo } from "react";
import { en, ar, type MessageKey } from "./messages";

export type Locale = "en" | "ar";

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

/**
 * Active UI language, persisted so a cashier's preference survives reloads.
 */
export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: "en",
      setLocale: (locale) => set({ locale }),
      toggleLocale: () => set({ locale: get().locale === "en" ? "ar" : "en" }),
    }),
    { name: "offlinepos:locale" },
  ),
);

const dictionaries = { en, ar };

/** Translate a key in the active locale, interpolating {placeholders}. */
export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const template = dictionaries[locale][key] ?? en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/** Translate using the current store value (for non-hook contexts). */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  return translate(useLocaleStore.getState().locale, key, vars);
}

/**
 * Reactive translation hook — re-renders the caller when the locale changes.
 * Prefer this over the bare `t()` inside components. The returned object and
 * the `t` closure are memoized per locale, so `useI18n` never breaks the
 * referential stability of parent components (no re-render churn on unrelated
 * state changes).
 */
export function useI18n() {
  const locale = useLocaleStore((s) => s.locale);
  const t = useMemo(
    () => (key: MessageKey, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
    [locale],
  );
  return useMemo(() => ({ locale, isAr: locale === "ar", t }), [locale, t]);
}
