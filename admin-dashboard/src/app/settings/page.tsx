"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Coins,
  Languages,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
} from "lucide-react";
import {
  useSettings,
  type Currency,
  type Theme,
} from "@/components/settings-provider";
import { cn } from "@/lib/utils";

const STORE_KEY = "admin-dashboard:store";

interface StoreProfile {
  name: string;
  vat: number;
  notifications: boolean;
}

const STORE_DEFAULTS: StoreProfile = { name: "Midtown Cafe", vat: 15, notifications: true };

/** Clamp VAT to a sane range; corrupted localStorage can hold anything. */
function clampVat(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : STORE_DEFAULTS.vat;
}

function readStore(): StoreProfile {
  if (typeof window === "undefined") return STORE_DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return STORE_DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<StoreProfile>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : STORE_DEFAULTS.name,
      vat: clampVat(parsed.vat),
      notifications: typeof parsed.notifications === "boolean" ? parsed.notifications : STORE_DEFAULTS.notifications,
    };
  } catch {
    return STORE_DEFAULTS;
  }
}

function Card({
  children,
  delay,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-slide-up rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700",
        className,
      )}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
        {icon}
      </div>
      <div>
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300">{subtitle}</p>
      </div>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  label: string;
}) {
  const btnRefs = useRef<Map<number, HTMLButtonElement | null>>(new Map());
  const setRef = useCallback((idx: number, el: HTMLButtonElement | null) => {
    btnRefs.current.set(idx, el);
  }, []);
  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    const len = options.length;
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      next = (idx + 1) % len;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      next = (idx - 1 + len) % len;
    }
    if (next >= 0) {
      e.preventDefault();
      btnRefs.current.get(next)?.focus();
      onChange(options[next].value);
    }
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
    >
      {options.map((option, idx) => (
        <button
          key={option.value}
          ref={(el) => setRef(idx, el)}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          tabIndex={value === option.value ? 0 : -1}
          onClick={() => onChange(option.value)}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            value === option.value
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-50"
              : "text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-200",
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-900";

export default function SettingsPage() {
  const { settings, setTheme, setLocale, setCurrency, toggleSidebar, t } =
    useSettings();
  const [store, setStore] = useState<StoreProfile>(() => readStore());
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (savedTimer.current !== null) window.clearTimeout(savedTimer.current);
    },
    [],
  );

  const saveStore = (e: React.FormEvent) => {
    e.preventDefault();
    const safe = { ...store, vat: clampVat(store.vat) };
    setStore(safe);
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(safe));
    } catch {
      // storage unavailable — ignore
    }
    setSaved(true);
    if (savedTimer.current !== null) window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {t("settings.title")}
        </h1>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          {t("settings.subtitle")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card delay={0}>
          <SectionHeader
            icon={<Sun className="h-4 w-4" />}
            title={t("settings.appearance")}
            subtitle={t("settings.appearanceSubtitle")}
          />
          <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            {t("settings.themeLabel")}
          </p>
          <Segmented<Theme>
            value={settings.theme}
            onChange={setTheme}
            label={t("aria.selectTheme")}
            options={[
              { value: "light", label: t("aria.themeLight"), icon: <Sun className="h-3.5 w-3.5" /> },
              { value: "dark", label: t("aria.themeDark"), icon: <Moon className="h-3.5 w-3.5" /> },
              { value: "system", label: t("aria.themeSystem"), icon: <Monitor className="h-3.5 w-3.5" /> },
            ]}
          />
        </Card>

        <Card delay={60}>
          <SectionHeader
            icon={<Languages className="h-4 w-4" />}
            title={t("settings.languageLabel")}
            subtitle={t("settings.languageSubtitle")}
          />
          <Segmented<"en" | "ar">
            value={settings.locale}
            onChange={setLocale}
            label={t("aria.selectLanguage")}
            options={[
              { value: "en", label: "English" },
              { value: "ar", label: "العربية" },
            ]}
          />
        </Card>

        <Card delay={120}>
          <SectionHeader
            icon={
              settings.sidebarCollapsed ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )
            }
            title={t("settings.sidebarLabel")}
            subtitle={t("settings.sidebarSubtitle")}
          />
          <Segmented<"expanded" | "collapsed">
            value={settings.sidebarCollapsed ? "collapsed" : "expanded"}
            onChange={() => toggleSidebar()}
            label={t("aria.selectSidebar")}
            options={[
              { value: "expanded", label: t("settings.sidebarExpanded"), icon: <PanelLeftOpen className="h-3.5 w-3.5" /> },
              { value: "collapsed", label: t("settings.sidebarCollapsed"), icon: <PanelLeftClose className="h-3.5 w-3.5" /> },
            ]}
          />
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
            {settings.sidebarCollapsed
              ? t("settings.sidebarCollapsedDesc")
              : t("settings.sidebarExpandedDesc")}
          </p>
        </Card>

        <Card delay={180}>
          <SectionHeader
            icon={<Coins className="h-4 w-4" />}
            title={t("settings.currencyLabel")}
            subtitle={t("settings.currencySubtitle")}
          />
          <label htmlFor="currency" className="sr-only">
            {t("settings.currencyLabel")}
          </label>
          <select
            id="currency"
            value={settings.currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className={inputClass}
          >
            <option value="SAR">SAR — Saudi Riyal</option>
            <option value="USD">USD — US Dollar</option>
            <option value="EGP">EGP — Egyptian Pound</option>
          </select>
        </Card>
      </div>

      <Card delay={240} className="max-w-3xl">
        <SectionHeader
          icon={<Check className="h-4 w-4" />}
          title={t("settings.storeProfile")}
          subtitle={t("settings.storeProfileSubtitle")}
        />
        <form className="space-y-4" onSubmit={saveStore}>
          <div>
            <label
              htmlFor="store-name"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              {t("settings.storeName")}
            </label>
            <input
              id="store-name"
              type="text"
              value={store.name}
              onChange={(e) => setStore((s) => ({ ...s, name: e.target.value }))}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="store-vat"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              {t("settings.vatRate")}
            </label>
            <input
              id="store-vat"
              type="number"
              min={0}
              max={100}
              value={store.vat}
              onChange={(e) =>
                setStore((s) => ({ ...s, vat: Number(e.target.value) }))
              }
              className={inputClass}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/50">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("settings.emailNotifications")}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {t("settings.emailNotificationsSub")}
              </p>
            </div>
            <input
              type="checkbox"
              checked={store.notifications}
              onChange={(e) =>
                setStore((s) => ({ ...s, notifications: e.target.checked }))
              }
              className="h-4 w-4 accent-blue-600"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              {t("settings.saveChanges")}
            </button>
            {saved && (
              <span
                role="status"
                className="inline-flex animate-fade-in items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400"
              >
                <Check className="h-4 w-4" />
                {t("settings.saved")}
              </span>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
