import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Short-lived HMAC-SHA256 request tokens shared between the Next.js proxy and
 * the Hono API. The web app resolves the authenticated user + org from the
 * Auth.js session, signs a compact token, and sends it as
 * `Authorization: Bearer <token>`. The API verifies the signature and expiry
 * before trusting the claimed identity — the raw tenant is never taken from a
 * client-supplied header.
 *
 * Trust model: the token proves "a component that knows `API_AUTH_SECRET`
 * vouches for { userId, orgId }". The API still trusts that pairing the same
 * way it previously trusted the proxy — the signing step is what moves the
 * trust boundary from an unauthenticated header to a shared secret.
 */
export type RequestTokenIdentity = {
  userId: string;
  orgId: string;
};

export type VerifiedRequestToken = RequestTokenIdentity;

type TokenPayload = {
  /** Subject — the authenticated user id. */
  sub: string;
  /** The organization the caller is scoped to. */
  org: string;
  /** Expiry as epoch milliseconds. */
  exp: number;
};

const SEPARATOR = '.';

function encodeBase64Url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function decodeBase64Url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

/** `payload.signature` is HMAC-SHA256(payload) — the secret never leaves the server. */
function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

/** Constant-time compare so timing cannot leak the signature bytes. */
function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf);
}

/**
 * Creates a signed request token for `{ userId, orgId }`.
 * The token embeds a base64url JSON payload plus an HMAC-SHA256 signature and
 * expires after `ttlMs` (default 60s — long enough for the proxy→API hop, short
 * enough that a leaked token is useless quickly).
 */
export function createRequestToken(
  identity: RequestTokenIdentity,
  secret: string,
  ttlMs = 60_000,
): string {
  if (!secret) {
    throw new Error('API_AUTH_SECRET is required to sign request tokens');
  }
  const payload = encodeBase64Url(
    JSON.stringify({
      sub: identity.userId,
      org: identity.orgId,
      exp: Date.now() + ttlMs,
    } satisfies TokenPayload),
  );
  return `${payload}${SEPARATOR}${sign(payload, secret)}`;
}

/**
 * Verifies `token` against `secret`. Throws on malformed input, a bad
 * signature, or an expired token; otherwise returns the claimed identity.
 */
export function verifyRequestToken(token: string, secret: string): VerifiedRequestToken {
  if (!secret) {
    throw new Error('API_AUTH_SECRET is required to verify request tokens');
  }
  const [payload, signature] = token.split(SEPARATOR);
  if (!payload || !signature) {
    throw new Error('Malformed request token');
  }
  if (!safeEqual(signature, sign(payload, secret))) {
    throw new Error('Invalid request token signature');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeBase64Url(payload));
  } catch {
    throw new Error('Malformed request token payload');
  }
  const data = parsed as Partial<TokenPayload>;
  if (typeof data.sub !== 'string' || typeof data.org !== 'string' || typeof data.exp !== 'number') {
    throw new Error('Malformed request token payload');
  }
  if (data.exp <= Date.now()) {
    throw new Error('Request token expired');
  }
  return { userId: data.sub, orgId: data.org };
}
