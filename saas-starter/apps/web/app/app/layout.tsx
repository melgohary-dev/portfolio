import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { auth } from '@saas/auth';
import { getMemberships, getSubscription } from '@saas/auth/db';
import { AppShell } from '@/components/app-shell';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }
  const memberships = await getMemberships(session.user.id);
  if (memberships.length === 0) {
    redirect('/app/settings');
  }
  const currentOrgId =
    session.currentOrgId && memberships.some((m) => m.organizationId === session.currentOrgId)
      ? session.currentOrgId
      : memberships[0]!.organizationId;
  const subscription = await getSubscription(currentOrgId);

  return (
    <AppShell
      session={session}
      user={{ name: session.user.name ?? null, email: session.user.email ?? '' }}
      memberships={memberships}
      currentOrgId={currentOrgId}
      plan={subscription?.plan ?? 'free'}
    >
      {children}
    </AppShell>
  );
}
