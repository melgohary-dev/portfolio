'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { requestPasswordResetAction, type AuthActionState } from '@/app/actions/auth';
import { LanguageToggle } from '@/components/language-toggle';
import { useI18n } from '@/components/i18n-provider';
import { errorKey } from '@/lib/i18n';
import { inputClass, primaryButtonClass } from '@/lib/ui-classes';

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState<
    AuthActionState | undefined,
    FormData
  >(requestPasswordResetAction, undefined);
  const { t } = useI18n();

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="absolute end-4 top-4">
          <LanguageToggle />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">{t('forgot.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('forgot.subtitle')}</p>
        </div>
        <form
          action={formAction}
          className="space-y-3 rounded-lg border border-gray-200 bg-white p-6"
        >
          <label htmlFor="forgot-email" className="sr-only">
            {t('forgot.emailPlaceholder')}
          </label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            required
            placeholder={t('forgot.emailPlaceholder')}
            className={inputClass}
          />
          {state?.ok ? (
            <p className="text-sm text-green-600">{t('forgot.sent')}</p>
          ) : state?.error ? (
            <p className="text-sm text-red-600">{t(errorKey(state.error))}</p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className={primaryButtonClass}
          >
            {pending ? t('forgot.sending') : t('forgot.submit')}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600">
          <Link href="/login" className="text-gray-900 underline">
            {t('forgot.backToLogin')}
          </Link>
        </p>
      </div>
    </main>
  );
}
