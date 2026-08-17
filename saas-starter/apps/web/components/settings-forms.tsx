'use client';

import { useActionState } from 'react';
import {
  createOrganizationAction,
  inviteMemberAction,
  type OrgActionState,
} from '@/app/actions/org';
import { useI18n } from '@/components/i18n-provider';
import { errorKey } from '@/lib/i18n';
import { inputClass, primaryButtonClass } from '@/lib/ui-classes';

export function CreateOrganizationForm() {
  const [state, formAction, pending] = useActionState<
    OrgActionState | undefined,
    FormData
  >(createOrganizationAction, undefined);
  const { t } = useI18n();

  return (
    <form action={formAction} className="space-y-3">
      <h2 className="text-base font-semibold">{t('forms.createOrg')}</h2>
      <div className="flex gap-2">
        <label htmlFor="org-name" className="sr-only">
          {t('forms.orgNamePlaceholder')}
        </label>
        <input
          id="org-name"
          name="name"
          required
          placeholder={t('forms.orgNamePlaceholder')}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={pending}
          className={`${primaryButtonClass} w-auto shrink-0`}
        >
          {pending ? t('forms.creating') : t('forms.create')}
        </button>
      </div>
      {state?.error ? (
        <p className="text-sm text-red-600">{t(errorKey(state.error))}</p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-green-600">{t('forms.orgCreated')}</p>
      ) : null}
    </form>
  );
}

export function InviteMemberForm() {
  const [state, formAction, pending] = useActionState<
    OrgActionState | undefined,
    FormData
  >(inviteMemberAction, undefined);
  const { t } = useI18n();

  return (
    <form action={formAction} className="space-y-3">
      <h2 className="text-base font-semibold">{t('forms.inviteMember')}</h2>
      <div className="flex gap-2">
        <label htmlFor="invite-email" className="sr-only">
          {t('forms.teammateEmail')}
        </label>
        <input
          id="invite-email"
          name="email"
          type="email"
          required
          placeholder={t('forms.teammateEmail')}
          className={inputClass}
        />
        <label htmlFor="invite-role" className="sr-only">
          {t('forms.member')}
        </label>
        <select
          id="invite-role"
          name="role"
          defaultValue="member"
          className="shrink-0 rounded-md border border-gray-300 px-2 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
        >
          <option value="member">{t('forms.member')}</option>
          <option value="admin">{t('forms.admin')}</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className={`${primaryButtonClass} w-auto shrink-0`}
        >
          {pending ? t('forms.inviting') : t('forms.invite')}
        </button>
      </div>
      {state?.error ? (
        <p className="text-sm text-red-600">{t(errorKey(state.error))}</p>
      ) : null}
      {state?.ok ? <p className="text-sm text-green-600">{t('forms.invited')}</p> : null}
    </form>
  );
}
