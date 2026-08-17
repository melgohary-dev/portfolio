import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { I18nProvider } from '@/components/i18n-provider';
import type { Locale } from '@/lib/i18n';
import './globals.css';

export const metadata: Metadata = {
  title: 'SaaS Starter',
  description: 'Multi-tenant SaaS monorepo starter — Next.js, Hono, Drizzle.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const store = await cookies();
  const locale: Locale = store.get('locale')?.value === 'ar' ? 'ar' : 'en';
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body>
        <I18nProvider initialLocale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
