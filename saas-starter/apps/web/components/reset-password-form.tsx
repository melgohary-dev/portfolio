'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { resetPasswordAction, type AuthActionState } from '@/app/actions/auth';
import { LanguageToggle } from '@/components/language-toggle';
import { useI18n } from '@/components/i18n-provider';
import { errorKey } from '@/lib/i18n';
import { inputClass, primaryButtonClass } from '@/lib/ui-classes';

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<
    AuthActionState | undefined,
    FormData
  >(resetPasswordAction, undefined);
  const { t } = useI18n();

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="absolute end-4 top-4">
          <LanguageToggle />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">{t('reset.chooseTitle')}</h1>
        </div>
        <form
          action={formAction}
          className="space-y-3 rounded-lg border border-gray-200 bg-white p-6"
        >
          <input type="hidden" name="token" value={token} />
          <label htmlFor="reset-password" className="sr-only">
            {t('reset.passwordPlaceholder')}
          </label>
          <input
            id="reset-password"
            name="password"
            type="password"
            required
            minLength={8}
            placeholder={t('reset.passwordPlaceholder')}
            className={inputClass}
          />
          {state?.ok ? (
            <p className="text-sm text-green-600">{t('reset.updated')}</p>
          ) : state?.error ? (
            <p className="text-sm text-red-600">{t(errorKey(state.error))}</p>
          ) : null}
          {state?.ok ? (
            <Link
              href="/login"
              className={`block w-full text-center ${primaryButtonClass}`}
            >
              {t('reset.goToLogin')}
            </Link>
          ) : (
            <button
              type="submit"
              disabled={pending}
              className={primaryButtonClass}
            >
              {pending ? t('reset.saving') : t('reset.submit')}
            </button>
          )}
        </form>
      </div>
    </main>
  );
}
