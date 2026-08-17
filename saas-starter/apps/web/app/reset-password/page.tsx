import Link from 'next/link';
import { ResetPasswordForm } from '@/components/reset-password-form';
import { getT } from '@/lib/server-i18n';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const t = await getT();

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 text-center">
          <h1 className="text-xl font-semibold text-gray-900">{t('reset.invalidTitle')}</h1>
          <p className="mt-2 text-sm text-gray-500">{t('reset.invalidBody')}</p>
          <Link
            href="/forgot-password"
            className="mt-4 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            {t('reset.requestNew')}
          </Link>
        </div>
      </main>
    );
  }

  return <ResetPasswordForm token={token} />;
}
