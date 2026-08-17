import { auth } from '@saas/auth';
import { resolveOrganizationId } from '@saas/auth/db';
import { createRequestToken } from '@saas/shared';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

type RouteContext = { params: Promise<{ path?: string[] }> };

/**
 * Header-forwarding contract:
 * - `content-type`/`accept` are passed through so the API's zod-validator sees
 *   the same media types the browser sent.
 * - `stripe-signature` must survive the proxy or Stripe webhooks can never be
 *   verified when pointed at this app's URL (the API rejects without it).
 * - `x-request-id`/`x-trace-id` thread the same correlation ids from Next into
 *   the API's pino logs.
 * Everything else is deliberately dropped.
 */
const FORWARD_HEADERS = ['content-type', 'accept', 'stripe-signature', 'x-request-id', 'x-trace-id'];

async function proxy(request: NextRequest, method: string, path: string[]) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Not signed in' } },
      { status: 401 },
    );
  }
  const orgId = await resolveOrganizationId(userId, session.currentOrgId);
  if (!orgId) {
    return NextResponse.json(
      { error: { code: 'NO_ORGANIZATION', message: 'No organization for this user' } },
      { status: 403 },
    );
  }

  const secret = process.env.API_AUTH_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: { code: 'AUTH_NOT_CONFIGURED', message: 'API_AUTH_SECRET is not set' } },
      { status: 500 },
    );
  }

  // The API never trusts a raw tenant header: it authenticates this request
  // from the HMAC-signed token (see packages/shared/src/request-token.ts).
  const token = createRequestToken({ userId, orgId }, secret);

  // Per-segment encoding so a segment containing reserved characters (e.g. a
  // "…" catch-all from Next) can never corrupt the upstream URL.
  const target = new URL(`/api/${path.map(encodeURIComponent).join('/')}`, API_URL);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = request.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }
  headers.set('authorization', `Bearer ${token}`);

  const init: RequestInit = {
    method,
    headers,
  };
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  const res = await fetch(target, init);
  const responseHeaders = new Headers();
  responseHeaders.set('content-type', res.headers.get('content-type') ?? 'application/json');
  // SSE passthrough: stream the body untouched so the EventSource stays open.
  if (res.headers.get('content-type')?.includes('text/event-stream')) {
    responseHeaders.set('cache-control', 'no-cache');
    responseHeaders.set('connection', 'keep-alive');
  }
  if (res.body) {
    return new Response(res.body, { status: res.status, headers: responseHeaders });
  }
  const body = await res.arrayBuffer();
  return new Response(body, { status: res.status, headers: responseHeaders });
}

function makeHandler(method: string) {
  return async (request: NextRequest, context: RouteContext) => {
    const { path = [] } = await context.params;
    return proxy(request, method, path);
  };
}

export const GET = makeHandler('GET');
export const POST = makeHandler('POST');
export const PUT = makeHandler('PUT');
export const PATCH = makeHandler('PATCH');
export const DELETE = makeHandler('DELETE');
