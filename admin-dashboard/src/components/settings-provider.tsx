"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  messages,
  resolvePath,
  type Locale,
  type Messages,
  type NestedKeyOf,
} from "@/lib/i18n";

export type Theme = "light" | "dark" | "system";
export type Currency = "SAR" | "USD" | "EGP";

export interface Settings {
  locale: Locale;
  theme: Theme;
  sidebarCollapsed: boolean;
  currency: Currency;
}

// Persisted settings schema. The shape is `Settings` (below); unknown fields
// are tolerated on read, known fields are validated and fall back to defaults,
// so a stale/corrupt value can never crash the app. Unversioned by design: the
// reader is the schema and is forward-compatible.
const STORAGE_KEY = "admin-dashboard:settings";
const DEFAULTS: Settings = {
  locale: "en",
  theme: "system",
  sidebarCollapsed: false,
  currency: "SAR",
};

function readSettings(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = { ...DEFAULTS, ...JSON.parse(raw) } as Settings;
    if (parsed.theme !== "light" && parsed.theme !== "dark" && parsed.theme !== "system") {
      parsed.theme = "system";
    }
    if (parsed.locale !== "en" && parsed.locale !== "ar") {
      parsed.locale = "en";
    }
    if (parsed.currency !== "SAR" && parsed.currency !== "USD" && parsed.currency !== "EGP") {
      parsed.currency = "SAR";
    }
    return parsed;
  } catch {
    return DEFAULTS;
  }
}

function subscribeMedia(callback: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function readMediaDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

interface SettingsContextValue {
  settings: Settings;
  isDark: boolean;
  locale: Locale;
  t: (key: NestedKeyOf<Messages>) => string;
  formatMoney: (value: number) => string;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: Theme) => void;
  setCurrency: (currency: Currency) => void;
  toggleSidebar: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<Settings>(() => readSettings());
  // `useSyncExternalStore` so the "system" theme resolves outside React's
  // render cycle and reacts to OS changes without a manual listener effect.
  const systemDark = useSyncExternalStore(
    subscribeMedia,
    readMediaDark,
    () => false,
  );
  const isDark =
    settings.theme === "dark"
      ? true
      : settings.theme === "light"
        ? false
        : systemDark;

  // Applying theme/lang/dir on the <html> element mirrors the inline
  // `THEME_INIT_SCRIPT` in `layout.tsx`. The script runs before hydration to
  // prevent a flash of the wrong theme (FOUC); this effect keeps the DOM in
  // sync after a settings change. Keep both in lockstep when adding fields.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    document.documentElement.lang = settings.locale;
    document.documentElement.dir = settings.locale === "ar" ? "rtl" : "ltr";
  }, [settings.locale]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // storage unavailable — ignore
    }
  }, [settings]);

  const t = useCallback(
    (key: NestedKeyOf<Messages>) =>
      resolvePath(messages[settings.locale], key) ??
      resolvePath(messages.en, key) ??
      key,
    [settings.locale],
  );

  // One `Intl.NumberFormat` per currency, reused across the grid's total
  // column (called per visible row per render). Constructing a fresh instance
  // per call is surprisingly expensive and allocates on every grid render.
  const moneyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: settings.currency,
        maximumFractionDigits: 0,
      }),
    [settings.currency],
  );

  const formatMoney = useCallback(
    (value: number) => moneyFormatter.format(value),
    [moneyFormatter],
  );

  const setLocale = useCallback(
    (locale: Locale) => setSettings((s) => ({ ...s, locale })),
    [],
  );
  const setTheme = useCallback(
    (theme: Theme) => setSettings((s) => ({ ...s, theme })),
    [],
  );
  const setCurrency = useCallback(
    (currency: Currency) => setSettings((s) => ({ ...s, currency })),
    [],
  );
  const toggleSidebar = useCallback(
    () => setSettings((s) => ({ ...s, sidebarCollapsed: !s.sidebarCollapsed })),
    [],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      isDark,
      locale: settings.locale,
      t,
      formatMoney,
      setLocale,
      setTheme,
      setCurrency,
      toggleSidebar,
    }),
    [
      settings,
      isDark,
      t,
      formatMoney,
      setLocale,
      setTheme,
      setCurrency,
      toggleSidebar,
    ],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return ctx;
}
