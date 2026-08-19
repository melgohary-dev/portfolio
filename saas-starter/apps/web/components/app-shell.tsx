'use client';

import type { Session } from 'next-auth';
import { SessionProvider, useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import type { Membership } from '@saas/auth/db';
import { signOutAction } from '@/app/actions/auth';
import { useI18n } from '@/components/i18n-provider';
import { LanguageToggle } from '@/components/language-toggle';

type AppShellProps = {
  session: Session | null;
  user: { name: string | null; email: string };
  memberships: Membership[];
  currentOrgId: string;
  plan: 'free' | 'pro';
  children: ReactNode;
};

export function AppShell(props: AppShellProps) {
  return (
    <SessionProvider session={props.session}>
      <ShellInner {...props} />
    </SessionProvider>
  );
}

function ShellInner({
  user,
  memberships,
  currentOrgId,
  plan,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { update } = useSession();
  const { t } = useI18n();

  const links = useMemo(
    () => [
      { href: '/app', label: t('nav.dashboard') },
      { href: '/app/orders', label: t('nav.orders') },
      { href: '/app/analytics', label: t('nav.analytics') },
      { href: '/app/settings', label: t('nav.settings') },
    ],
    [t],
  );

  async function onOrgChange(value: string) {
    await update({ currentOrgId: value });
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <nav aria-label="Main navigation" className="flex w-60 shrink-0 flex-col gap-6 border-s p-4">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {t('nav.organization')}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                plan === 'pro'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {plan === 'pro' ? t('plan.pro') : t('plan.free')}
            </span>
          </div>
          <label htmlFor="org-switcher" className="sr-only">
            {t('nav.organization')}
          </label>
          <select
            id="org-switcher"
            value={currentOrgId}
            onChange={(e) => onOrgChange(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
          >
            {memberships.map((m) => (
              <option key={m.organizationId} value={m.organizationId}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          {links.map((link) => {
            const active =
              link.href === '/app'
                ? pathname === '/app'
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block rounded-md px-3 py-2 text-sm ${
                  active
                    ? 'bg-gray-900 font-medium text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-auto space-y-2 border-t pt-4 text-sm">
          <p className="truncate font-medium text-gray-900">{user.name ?? user.email}</p>
          <p className="truncate text-gray-500">{user.email}</p>
          <form action={signOutAction} className="mt-2">
            <button
              type="submit"
              className="text-gray-500 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500"
            >
              {t('nav.signOut')}
            </button>
          </form>
          <LanguageToggle />
        </div>
      </nav>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
