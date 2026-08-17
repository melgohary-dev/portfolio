import { describe, expect, it } from 'vitest';
import { createRequestToken, verifyRequestToken } from '../src/request-token.js';

const SECRET = 'test-secret-value';
const identity = { userId: 'user-123', orgId: 'org-456' };

describe('createRequestToken / verifyRequestToken', () => {
  it('round-trips a token and returns the claimed identity', () => {
    const token = createRequestToken(identity, SECRET);
    expect(verifyRequestToken(token, SECRET)).toEqual(identity);
  });

  it('produces base64url payload segments and a distinct signature', () => {
    const token = createRequestToken(identity, SECRET);
    const [payload, signature] = token.split('.');
    expect(payload).toBeDefined();
    expect(signature).toBeDefined();
    expect(signature).not.toBe(payload);
    expect(Buffer.from(payload!, 'base64url').toString('utf8')).toContain('"sub":"user-123"');
  });

  it('rejects a token signed with a different secret', () => {
    const token = createRequestToken(identity, SECRET);
    expect(() => verifyRequestToken(token, 'other-secret')).toThrow(
      'Invalid request token signature',
    );
  });

  it('rejects a tampered payload', () => {
    const token = createRequestToken(identity, SECRET);
    const [, signature] = token.split('.');
    const tampered = Buffer.from(
      JSON.stringify({ sub: 'attacker', org: identity.orgId, exp: Date.now() + 60_000 }),
    ).toString('base64url');
    expect(() => verifyRequestToken(`${tampered}.${signature}`, SECRET)).toThrow(
      'Invalid request token signature',
    );
  });

  it('rejects an expired token', () => {
    const token = createRequestToken(identity, SECRET, -1);
    expect(() => verifyRequestToken(token, SECRET)).toThrow('Request token expired');
  });

  it('rejects malformed tokens', () => {
    expect(() => verifyRequestToken('not-a-token', SECRET)).toThrow('Malformed request token');
    expect(() => verifyRequestToken('abc.def.ghi', SECRET)).toThrow(
      'Invalid request token signature',
    );
  });

  it('throws when no secret is provided', () => {
    expect(() => createRequestToken(identity, '')).toThrow('API_AUTH_SECRET');
    expect(() => verifyRequestToken('a.b', '')).toThrow('API_AUTH_SECRET');
  });
});
