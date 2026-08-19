import { describe, it, expect } from 'vitest';
import { slugify } from '../src/db.js';

describe('slugify', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugify('My Organization')).toBe('my-organization');
  });

  it('removes special characters', () => {
    expect(slugify('Org #1! @Best')).toBe('org-1-best');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  --hello--  ')).toBe('hello');
  });

  it('collapses multiple hyphens', () => {
    expect(slugify('a   b   c')).toBe('a-b-c');
  });

  it('truncates to 40 characters', () => {
    const long = 'a'.repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(40);
  });

  it('returns "org" for empty or whitespace-only input', () => {
    expect(slugify('')).toBe('org');
    expect(slugify('   ')).toBe('org');
    expect(slugify('---')).toBe('org');
  });

  it('handles arabic input by stripping non-latin chars', () => {
    const result = slugify('مؤسسة تجريبية');
    // Arabic chars are stripped, leaving only hyphens which are trimmed
    expect(result).toBe('org');
  });

  it('preserves numbers', () => {
    expect(slugify('org123')).toBe('org123');
  });

  it('handles single character', () => {
    expect(slugify('A')).toBe('a');
  });

  it('normalizes unicode separators', () => {
    expect(slugify('org\u00A0name')).toBe('org-name');
  });
});
