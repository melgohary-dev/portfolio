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

const STORAGE_KEY = "admin-dashboard:settings";

interface StoredSettings {
  locale: Locale;
  theme: Theme;
  sidebarCollapsed: boolean;
  currency: Currency;
}

const DEFAULTS: StoredSettings = {
  locale: "en",
  theme: "system",
  sidebarCollapsed: false,
  currency: "SAR",
};

function readSettings(): StoredSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = { ...DEFAULTS, ...JSON.parse(raw) } as StoredSettings;
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

// --- Theme context ---
interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// --- Locale context ---
interface LocaleContextValue {
  locale: Locale;
  t: (key: NestedKeyOf<Messages>) => string;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

// --- Currency context ---
interface CurrencyContextValue {
  currency: Currency;
  formatMoney: (value: number) => string;
  setCurrency: (currency: Currency) => void;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

// --- Sidebar context ---
interface SidebarContextValue {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<StoredSettings>(() => readSettings());
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
      // storage unavailable
    }
  }, [settings]);

  const setTheme = useCallback(
    (theme: Theme) => setSettings((s) => ({ ...s, theme })),
    [],
  );
  const setLocale = useCallback(
    (locale: Locale) => setSettings((s) => ({ ...s, locale })),
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

  const t = useCallback(
    (key: NestedKeyOf<Messages>) =>
      resolvePath(messages[settings.locale], key) ??
      resolvePath(messages.en, key) ??
      key,
    [settings.locale],
  );

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

  const themeValue = useMemo<ThemeContextValue>(
    () => ({ theme: settings.theme, isDark, setTheme }),
    [settings.theme, isDark, setTheme],
  );

  const localeValue = useMemo<LocaleContextValue>(
    () => ({ locale: settings.locale, t, setLocale }),
    [settings.locale, t, setLocale],
  );

  const currencyValue = useMemo<CurrencyContextValue>(
    () => ({ currency: settings.currency, formatMoney, setCurrency }),
    [settings.currency, formatMoney, setCurrency],
  );

  const sidebarValue = useMemo<SidebarContextValue>(
    () => ({ sidebarCollapsed: settings.sidebarCollapsed, toggleSidebar }),
    [settings.sidebarCollapsed, toggleSidebar],
  );

  return (
    <ThemeContext.Provider value={themeValue}>
      <LocaleContext.Provider value={localeValue}>
        <CurrencyContext.Provider value={currencyValue}>
          <SidebarContext.Provider value={sidebarValue}>
            {children}
          </SidebarContext.Provider>
        </CurrencyContext.Provider>
      </LocaleContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a SettingsProvider");
  return ctx;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a SettingsProvider");
  return ctx;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within a SettingsProvider");
  return ctx;
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within a SettingsProvider");
  return ctx;
}

export function useSettings() {
  const theme = useTheme();
  const locale = useLocale();
  const currency = useCurrency();
  const sidebar = useSidebar();
  return useMemo(
    () => ({
      settings: {
        locale: locale.locale,
        theme: theme.theme,
        sidebarCollapsed: sidebar.sidebarCollapsed,
        currency: currency.currency,
      },
      isDark: theme.isDark,
      locale: locale.locale,
      t: locale.t,
      formatMoney: currency.formatMoney,
      setLocale: locale.setLocale,
      setTheme: theme.setTheme,
      setCurrency: currency.setCurrency,
      toggleSidebar: sidebar.toggleSidebar,
    }),
    [theme, locale, currency, sidebar],
  );
}

export interface Settings {
  locale: Locale;
  theme: Theme;
  sidebarCollapsed: boolean;
  currency: Currency;
}
