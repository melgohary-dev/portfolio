import { auth } from '@saas/auth';
import { resolveOrganizationId } from '@saas/auth/db';
import { createRequestToken } from '@saas/shared';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

interface ApiErrorResponse {
  error?: {
    code?: unknown;
    message?: unknown;
    details?: unknown;
  };
}

function isApiErrorResponse(data: unknown): data is ApiErrorResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof (data as Record<string, unknown>).error === 'object'
  );
}

export class ApiFetchError extends Error {
  code: string;
  details: unknown;
  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'ApiFetchError';
    this.code = code;
    this.details = details;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw new ApiFetchError('Not signed in', 'UNAUTHORIZED');
  }
  const orgId = await resolveOrganizationId(userId, session.currentOrgId);
  if (!orgId) {
    throw new ApiFetchError('No organization for this user', 'NO_ORGANIZATION');
  }

  const secret = process.env.API_AUTH_SECRET;
  if (!secret) {
    throw new ApiFetchError('API_AUTH_SECRET is not set', 'AUTH_NOT_CONFIGURED');
  }

  const token = createRequestToken({ userId, orgId }, secret);
  const target = new URL(`/api/${path.replace(/^\/+/, '')}`, API_URL);
  const res = await fetch(target, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      ...init?.headers,
    },
    cache: 'no-store',
  });
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ApiFetchError(
      `API request failed with status ${res.status}`,
      'API_ERROR',
      { status: res.status },
    );
  }
  if (!res.ok) {
    if (isApiErrorResponse(data)) {
      const err = data.error;
      throw new ApiFetchError(
        typeof err?.message === 'string' ? err.message : `API request failed (${res.status})`,
        typeof err?.code === 'string' ? err.code : 'API_ERROR',
        err?.details,
      );
    }
    throw new ApiFetchError(`API request failed (${res.status})`, 'API_ERROR');
  }
  return data as T;
}
