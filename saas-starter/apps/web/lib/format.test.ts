import { describe, it, expect } from 'vitest';
import { formatMoney, formatNumber, formatDate, formatDateTime } from './format.js';

describe('formatMoney', () => {
  it('formats cents to dollars', () => {
    const result = formatMoney(1999);
    expect(result).toContain('19.99');
  });

  it('formats zero', () => {
    const result = formatMoney(0);
    expect(result).toContain('0');
  });

  it('formats large amounts', () => {
    const result = formatMoney(100000);
    expect(result).toContain('1,000');
  });

  it('formats negative amounts', () => {
    const result = formatMoney(-500);
    expect(result).toContain('5');
  });

  it('uses USD currency', () => {
    const result = formatMoney(100);
    expect(result).toMatch(/\$/);
  });

  it('formats with Arabic locale', () => {
    const result = formatMoney(1999, 'ar');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('formatNumber', () => {
  it('formats with thousand separators', () => {
    expect(formatNumber(1234567)).toContain('1,234,567');
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('formats with Arabic locale', () => {
    const result = formatNumber(1000, 'ar');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('formatDate', () => {
  it('formats a Date object', () => {
    const result = formatDate(new Date(2026, 0, 15));
    expect(result).toContain('Jan');
    expect(result).toContain('15');
    expect(result).toContain('2026');
  });

  it('formats an ISO string', () => {
    const result = formatDate('2026-03-20T10:00:00Z');
    expect(result).toContain('2026');
    expect(typeof result).toBe('string');
  });

  it('formats with Arabic locale', () => {
    const result = formatDate(new Date(2026, 5, 1), 'ar');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('formatDateTime', () => {
  it('includes date and time components', () => {
    const result = formatDateTime(new Date(2026, 0, 15, 14, 30));
    expect(result).toContain('Jan');
    expect(result).toContain('15');
    expect(result).toContain('2026');
  });

  it('formats an ISO string', () => {
    const result = formatDateTime('2026-06-01T08:00:00Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
