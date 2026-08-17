'use client';

import { useI18n } from '@/components/i18n-provider';

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  const next = locale === 'en' ? 'ar' : 'en';
  const label = next === 'ar' ? 'العربية' : 'English';

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      aria-label={t('nav.changeLanguage')}
      className={`inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 ${className}`}
    >
      {label}
    </button>
  );
}
