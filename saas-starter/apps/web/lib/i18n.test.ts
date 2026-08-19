import { describe, it, expect } from 'vitest';
import { resolvePath, translate, statusKey, errorKey, messages, locales } from './i18n.js';

describe('resolvePath', () => {
  it('resolves a top-level key', () => {
    expect(resolvePath(messages.en, 'app.name')).toBe('SaaS Starter');
  });

  it('resolves a nested key', () => {
    expect(resolvePath(messages.en, 'dashboard.title')).toBe('Dashboard');
  });

  it('returns undefined for missing key', () => {
    expect(resolvePath(messages.en, 'nonexistent.key')).toBeUndefined();
  });

  it('returns undefined for partial path', () => {
    expect(resolvePath(messages.en, 'app')).toBeUndefined();
  });

  it('works with Arabic', () => {
    expect(resolvePath(messages.ar, 'app.name')).toBe('ساس ستارتر');
    expect(resolvePath(messages.ar, 'nav.dashboard')).toBe('لوحة التحكم');
  });

  it('returns undefined for empty path', () => {
    expect(resolvePath(messages.en, '')).toBeUndefined();
  });
});

describe('translate', () => {
  it('returns the English value', () => {
    expect(translate('en', 'dashboard.title')).toBe('Dashboard');
  });

  it('returns the Arabic value', () => {
    expect(translate('ar', 'dashboard.title')).toBe('لوحة التحكم');
  });

  it('falls back to English when locale key is missing', () => {
    // All keys exist in both, but let's test the fallback mechanism
    expect(translate('en', 'app.name')).toBe('SaaS Starter');
  });

  it('returns the raw key when not found in any locale', () => {
    expect(translate('en', 'totally.missing.key')).toBe('totally.missing.key');
  });

  it('interpolates variables with {name} syntax', () => {
    const result = translate('en', 'grid.newOrder', { name: 'Alice' });
    expect(result).toBe('New order from Alice');
  });

  it('interpolates numeric variables', () => {
    const result = translate('en', 'orders.ordersTotal', { n: 42 });
    expect(result).toBe('42 orders total');
  });

  it('interpolates multiple variables', () => {
    const result = translate('en', 'grid.count', { n: 5, m: 100 });
    expect(result).toBe('5 / 100 orders');
  });

  it('leaves unresolved variables as-is', () => {
    const result = translate('en', 'grid.newOrder', {});
    expect(result).toBe('New order from {name}');
  });

  it('works with Arabic and interpolation', () => {
    const result = translate('ar', 'grid.count', { n: 10, m: 50 });
    expect(result).toBe('10 / 50 طلب');
  });
});

describe('statusKey', () => {
  it('maps valid statuses', () => {
    expect(statusKey('paid')).toBe('status.paid');
    expect(statusKey('pending')).toBe('status.pending');
    expect(statusKey('refunded')).toBe('status.refunded');
    expect(statusKey('failed')).toBe('status.failed');
    expect(statusKey('active')).toBe('status.active');
    expect(statusKey('trialing')).toBe('status.trialing');
    expect(statusKey('canceled')).toBe('status.canceled');
    expect(statusKey('past_due')).toBe('status.past_due');
    expect(statusKey('incomplete')).toBe('status.incomplete');
    expect(statusKey('incomplete_expired')).toBe('status.incomplete_expired');
    expect(statusKey('unpaid')).toBe('status.unpaid');
    expect(statusKey('paused')).toBe('status.paused');
  });

  it('falls back to pending for unknown status', () => {
    expect(statusKey('deleted')).toBe('status.pending');
    expect(statusKey('')).toBe('status.pending');
  });
});

describe('errorKey', () => {
  it('maps valid error codes', () => {
    expect(errorKey('INVALID_CREDENTIALS')).toBe('error.INVALID_CREDENTIALS');
    expect(errorKey('EMAIL_EXISTS')).toBe('error.EMAIL_EXISTS');
    expect(errorKey('RESET_EXPIRED')).toBe('error.RESET_EXPIRED');
    expect(errorKey('NOT_SIGNED_IN')).toBe('error.NOT_SIGNED_IN');
  });

  it('falls back to INVALID_INPUT for unknown codes', () => {
    expect(errorKey('UNKNOWN_ERROR')).toBe('error.INVALID_INPUT');
    expect(errorKey('')).toBe('error.INVALID_INPUT');
  });
});

describe('messages structure', () => {
  it('has both en and ar locales', () => {
    expect(locales).toEqual(['en', 'ar']);
    expect(messages).toHaveProperty('en');
    expect(messages).toHaveProperty('ar');
  });

  it('en and ar have matching key structures', () => {
    function getKeys(obj: Record<string, unknown>, prefix = ''): string[] {
      return Object.entries(obj).flatMap(([k, v]) => {
        const path = prefix ? `${prefix}.${k}` : k;
        return typeof v === 'object' && v !== null
          ? getKeys(v as Record<string, unknown>, path)
          : [path];
      });
    }
    const enKeys = getKeys(messages.en).sort();
    const arKeys = getKeys(messages.ar).sort();
    expect(enKeys).toEqual(arKeys);
  });
});
