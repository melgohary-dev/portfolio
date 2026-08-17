'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { loginAction, type AuthActionState } from '@/app/actions/auth';
import { LanguageToggle } from '@/components/language-toggle';
import { useI18n } from '@/components/i18n-provider';
import { errorKey } from '@/lib/i18n';
import { inputClass, primaryButtonClass } from '@/lib/ui-classes';

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<
    AuthActionState | undefined,
    FormData
  >(loginAction, undefined);
  const { t } = useI18n();

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="absolute end-4 top-4">
          <LanguageToggle />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">SaaS Starter</h1>
          <p className="mt-1 text-sm text-gray-500">{t('auth.signInTitle')}</p>
        </div>
        <form
          action={formAction}
          className="space-y-3 rounded-lg border border-gray-200 bg-white p-6"
        >
          <label htmlFor="login-email" className="sr-only">
            {t('auth.emailPlaceholder')}
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            required
            placeholder={t('auth.emailPlaceholder')}
            className={inputClass}
          />
          <label htmlFor="login-password" className="sr-only">
            {t('auth.passwordPlaceholder')}
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            required
            placeholder={t('auth.passwordPlaceholder')}
            className={inputClass}
          />
          {state?.error ? (
            <p className="text-sm text-red-600">{t(errorKey(state.error))}</p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className={primaryButtonClass}
          >
            {pending ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>
        <div className="flex items-center justify-between text-sm">
          <Link href="/register" className="text-gray-600 hover:text-gray-900">
            {t('auth.createAccount')}
          </Link>
          <Link href="/forgot-password" className="text-gray-600 hover:text-gray-900">
            {t('auth.forgotPassword')}
          </Link>
        </div>
      </div>
    </main>
  );
}
