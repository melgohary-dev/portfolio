import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../src/password.js';

describe('hashPassword', () => {
  it('returns a bcrypt hash string', async () => {
    const hash = await hashPassword('test123');
    expect(typeof hash).toBe('string');
    expect(hash).toMatch(/^\$2[aby]?\$/);
    expect(hash.length).toBeGreaterThan(50);
  });

  it('produces different hashes for the same input (unique salts)', async () => {
    const a = await hashPassword('test123');
    const b = await hashPassword('test123');
    expect(a).not.toBe(b);
  });
});

describe('verifyPassword', () => {
  it('returns true for matching password', async () => {
    const hash = await hashPassword('correcthorse');
    expect(await verifyPassword('correcthorse', hash)).toBe(true);
  });

  it('returns false for wrong password', async () => {
    const hash = await hashPassword('correcthorse');
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('returns false for empty string against non-empty password', async () => {
    const hash = await hashPassword('secret');
    expect(await verifyPassword('', hash)).toBe(false);
  });

  it('works with special characters', async () => {
    const hash = await hashPassword('p@$$w0rd!&#*');
    expect(await verifyPassword('p@$$w0rd!&#*', hash)).toBe(true);
    expect(await verifyPassword('p@$$w0rd', hash)).toBe(false);
  });

  it('works with unicode', async () => {
    const hash = await hashPassword('كلمة-مرور-عربية');
    expect(await verifyPassword('كلمة-مرور-عربية', hash)).toBe(true);
  });
});
