import Link from 'next/link';
import { LanguageToggle } from '@/components/language-toggle';
import { getT } from '@/lib/server-i18n';

export default async function Home() {
  const t = await getT();
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <h1 className="text-3xl font-semibold">SaaS Starter</h1>
      <p className="text-gray-600">Multi-tenant SaaS monorepo starter — Next.js, Hono, Drizzle.</p>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700"
        >
          {t('auth.signIn')}
        </Link>
        <Link
          href="/app"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
        >
          Go to app
        </Link>
      </div>
    </main>
  );
}
