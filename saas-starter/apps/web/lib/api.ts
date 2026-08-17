import { auth } from '@saas/auth';
import { resolveOrganizationId } from '@saas/auth/db';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error('Not signed in');
  }
  const orgId = await resolveOrganizationId(userId, session.currentOrgId);
  if (!orgId) {
    throw new Error('No organization for this user');
  }
  const target = new URL(`/api/${path.replace(/^\/+/, '')}`, API_URL);
  const res = await fetch(target, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': orgId,
      ...init?.headers,
    },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `API request failed (${res.status})`);
  }
  return data as T;
}
