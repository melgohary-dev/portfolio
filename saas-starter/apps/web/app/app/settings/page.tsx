import { redirect } from 'next/navigation';
import { auth } from '@saas/auth';
import {
  getMemberships,
  getSubscription,
  listMembers,
  resolveOrganizationId,
} from '@saas/auth/db';
import { apiFetch } from '@/lib/api';
import { getT } from '@/lib/server-i18n';
import { statusKey } from '@/lib/i18n';
import { BillingSettings } from '@/components/billing-settings';
import { CreateOrganizationForm, InviteMemberForm } from '@/components/settings-forms';
import type { BillingOverview } from '@saas/shared';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string; cancelled?: string; mockPortal?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }
  const params = await searchParams;
  const t = await getT();
  const memberships = await getMemberships(session.user.id);
  const orgId = await resolveOrganizationId(session.user.id, session.currentOrgId);
  const currentOrg = memberships.find((m) => m.organizationId === orgId);
  const members = orgId ? await listMembers(orgId) : [];
  const subscription = orgId ? await getSubscription(orgId) : null;
  const billing: BillingOverview | null = orgId
    ? await apiFetch<BillingOverview>('billing').catch(() => null)
    : null;

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{t('settings.title')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('settings.subtitle')}</p>
      </div>

      {params.upgraded ? (
        <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {t('settings.upgraded')}
        </div>
      ) : null}
      {params.cancelled ? (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          {t('settings.cancelled')}
        </div>
      ) : null}
      {params.mockPortal ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          {t('settings.mockPortal')}
        </div>
      ) : null}

      <section className="rounded-lg border p-5">
        <h2 className="text-base font-semibold">{t('settings.organization')}</h2>
        <dl className="mt-3 space-y-1 text-sm">
          <Row label={t('settings.name')} value={currentOrg?.name ?? '—'} />
          <Row label={t('settings.slug')} value={currentOrg?.slug ?? '—'} />
          <Row
            label={t('settings.plan')}
            value={
              subscription
                ? `${t(`plan.${subscription.plan}`)} (${t(statusKey(subscription.status))})`
                : t('settings.freeActive')
            }
          />
        </dl>
      </section>

      {billing ? (
        <section className="rounded-lg border p-5">
          <h2 className="text-base font-semibold">{t('settings.billing')}</h2>
          <div className="mt-4">
            <BillingSettings
              mode={billing.mode}
              plans={billing.plans}
              subscription={billing.subscription}
            />
          </div>
        </section>
      ) : (
        orgId && (
          <section className="rounded-lg border p-5">
            <h2 className="text-base font-semibold">{t('settings.billing')}</h2>
            <p className="mt-2 text-sm text-gray-600">{t('analytics.loading')}</p>
          </section>
        )
      )}

      <section className="rounded-lg border p-5">
        <h2 className="text-base font-semibold">{t('settings.team')}</h2>
        <ul className="mt-3 divide-y divide-gray-100 text-sm">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center justify-between gap-2 py-2">
              <span className="font-medium">{m.name ?? m.email}</span>
              <span className="text-gray-600">{m.email}</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize">
                {m.role}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t pt-4">
          <InviteMemberForm />
        </div>
      </section>

      <section className="rounded-lg border p-5">
        <CreateOrganizationForm />
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-16 text-gray-600">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
