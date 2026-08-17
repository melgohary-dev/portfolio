import { cookies } from 'next/headers';
import { translate, type Locale, type MessageKey } from './i18n';

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return store.get('locale')?.value === 'ar' ? 'ar' : 'en';
}

export async function getT(): Promise<(key: MessageKey, vars?: Record<string, string | number>) => string> {
  const locale = await getLocale();
  return (key, vars) => translate(locale, key, vars);
}
