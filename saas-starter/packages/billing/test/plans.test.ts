import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPlans, isMockMode, appUrl } from '../src/plans.js';

describe('getPlans', () => {
  it('returns free and pro plans with prices', () => {
    const plans = getPlans();
    expect(plans).toHaveLength(2);
    const free = plans.find((p) => p.id === 'free');
    const pro = plans.find((p) => p.id === 'pro');
    expect(free?.priceMonthlyCents).toBe(0);
    expect(pro?.priceMonthlyCents).toBe(2900);
    expect(pro?.highlight).toBe(true);
    expect(free?.features.length).toBeGreaterThan(0);
  });

  it('reads the pro price id from the environment', () => {
    vi.stubEnv('STRIPE_PRICE_PRO_MONTHLY', 'price_123');
    const pro = getPlans().find((p) => p.id === 'pro');
    expect(pro?.priceId).toBe('price_123');
    vi.unstubAllEnvs();
  });

  it('leaves the pro price id null when unset', () => {
    vi.stubEnv('STRIPE_PRICE_PRO_MONTHLY', '');
    const pro = getPlans().find((p) => p.id === 'pro');
    expect(pro?.priceId).toBeNull();
    vi.unstubAllEnvs();
  });
});

describe('isMockMode', () => {
  it('returns true when no secret key is set', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    expect(isMockMode()).toBe(true);
    vi.unstubAllEnvs();
  });

  it('returns false when a secret key is set', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_abc');
    expect(isMockMode()).toBe(false);
    vi.unstubAllEnvs();
  });
});

describe('appUrl', () => {
  const original = process.env.APP_URL;
  beforeEach(() => {
    delete process.env.APP_URL;
  });
  afterEach(() => {
    if (original !== undefined) {
      process.env.APP_URL = original;
    }
  });

  it('defaults to localhost', () => {
    expect(appUrl()).toBe('http://localhost:3000');
  });

  it('uses the APP_URL environment variable', () => {
    vi.stubEnv('APP_URL', 'https://example.com');
    expect(appUrl()).toBe('https://example.com');
    vi.unstubAllEnvs();
  });
});
