import type { Locale } from './i18n';

const locales: Record<Locale, string> = { en: 'en-US', ar: 'ar-EG' };

function intlLocale(locale: Locale): string {
  return locales[locale] ?? 'en-US';
}

const currencyFormatters = new Map<string, Intl.NumberFormat>();
const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

export function formatMoney(cents: number, locale: Locale = 'en'): string {
  const key = `${locale}:USD`;
  let fmt = currencyFormatters.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(intlLocale(locale), {
      style: 'currency',
      currency: 'USD',
    });
    currencyFormatters.set(key, fmt);
  }
  return fmt.format(cents / 100);
}

export function formatNumber(n: number, locale: Locale = 'en'): string {
  const key = locale;
  let fmt = numberFormatters.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(intlLocale(locale));
    numberFormatters.set(key, fmt);
  }
  return fmt.format(n);
}

export function formatDate(date: Date | string, locale: Locale = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const key = locale;
  let fmt = dateFormatters.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(intlLocale(locale), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    dateFormatters.set(key, fmt);
  }
  return fmt.format(d);
}

export function formatDateTime(date: Date | string, locale: Locale = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const key = `${locale}:dt`;
  let fmt = dateFormatters.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(intlLocale(locale), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    dateFormatters.set(key, fmt);
  }
  return fmt.format(d);
}
