'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { registerAction, type AuthActionState } from '@/app/actions/auth';
import { LanguageToggle } from '@/components/language-toggle';
import { useI18n } from '@/components/i18n-provider';
import { errorKey } from '@/lib/i18n';
import { inputClass, primaryButtonClass } from '@/lib/ui-classes';

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState<
    AuthActionState | undefined,
    FormData
  >(registerAction, undefined);
  const { t } = useI18n();

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="absolute end-4 top-4">
          <LanguageToggle />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">{t('register.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('register.subtitle')}</p>
        </div>
        <form
          action={formAction}
          className="space-y-3 rounded-lg border border-gray-200 bg-white p-6"
        >
          <label htmlFor="register-name" className="sr-only">
            {t('register.namePlaceholder')}
          </label>
          <input
            id="register-name"
            name="name"
            required
            placeholder={t('register.namePlaceholder')}
            className={inputClass}
          />
          <label htmlFor="register-email" className="sr-only">
            {t('register.emailPlaceholder')}
          </label>
          <input
            id="register-email"
            name="email"
            type="email"
            required
            placeholder={t('register.emailPlaceholder')}
            className={inputClass}
          />
          <label htmlFor="register-org" className="sr-only">
            {t('register.orgNamePlaceholder')}
          </label>
          <input
            id="register-org"
            name="orgName"
            required
            placeholder={t('register.orgNamePlaceholder')}
            className={inputClass}
          />
          <label htmlFor="register-password" className="sr-only">
            {t('register.passwordPlaceholder')}
          </label>
          <input
            id="register-password"
            name="password"
            type="password"
            required
            minLength={8}
            placeholder={t('register.passwordPlaceholder')}
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
            {pending ? t('register.creating') : t('register.submit')}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600">
          {t('register.alreadyHave')}{' '}
          <Link href="/login" className="text-gray-900 underline">
            {t('register.logIn')}
          </Link>
        </p>
      </div>
    </main>
  );
}
