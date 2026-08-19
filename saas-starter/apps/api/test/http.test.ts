import { describe, it, expect } from 'vitest';
import { ApiError, apiErrorEnvelope, formatZodIssues } from '../src/http.js';
import { ZodError, z } from 'zod';

describe('ApiError', () => {
  it('stores status, code, message, and details', () => {
    const err = new ApiError(404, 'NOT_FOUND', 'Not found', { path: '/users' });
    expect(err.status).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Not found');
    expect(err.details).toEqual({ path: '/users' });
    expect(err.name).toBe('ApiError');
  });

  it('is an instance of Error', () => {
    const err = new ApiError(400, 'BAD', 'bad request');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });

  it('has undefined details when not provided', () => {
    const err = new ApiError(500, 'INTERNAL', 'Internal error');
    expect(err.details).toBeUndefined();
  });

  it('has a stack trace', () => {
    const err = new ApiError(400, 'ERR', 'msg');
    expect(err.stack).toBeDefined();
    expect(err.stack).toContain('ApiError');
  });
});

describe('apiErrorEnvelope', () => {
  it('returns correct error shape', () => {
    const result = apiErrorEnvelope('NOT_FOUND', 'Not found');
    expect(result).toEqual({
      error: { code: 'NOT_FOUND', message: 'Not found' },
    });
  });

  it('includes details when provided', () => {
    const result = apiErrorEnvelope('VALIDATION', 'Bad input', [{ path: 'email', message: 'required' }]);
    expect(result.error.details).toEqual([{ path: 'email', message: 'required' }]);
  });

  it('omits details key when undefined', () => {
    const result = apiErrorEnvelope('ERR', 'msg');
    expect(result).not.toHaveProperty('details');
    expect('details' in result.error).toBe(false);
  });

  it('accepts object details', () => {
    const result = apiErrorEnvelope('ERR', 'msg', { field: 'name', reason: 'empty' });
    expect(result.error.details).toEqual({ field: 'name', reason: 'empty' });
  });

  it('accepts string details', () => {
    const result = apiErrorEnvelope('ERR', 'msg', 'extra info');
    expect(result.error.details).toBe('extra info');
  });
});

describe('formatZodIssues', () => {
  it('formats single issue', () => {
    const schema = z.object({ email: z.string().email() });
    try {
      schema.parse({ email: 'bad' });
    } catch (e) {
      const issues = formatZodIssues(e as ZodError);
      expect(issues).toHaveLength(1);
      expect(issues[0].path).toBe('email');
      expect(typeof issues[0].message).toBe('string');
    }
  });

  it('formats nested path', () => {
    const schema = z.object({
      user: z.object({ address: z.object({ city: z.string().min(1) }) }),
    });
    try {
      schema.parse({ user: { address: { city: '' } } });
    } catch (e) {
      const issues = formatZodIssues(e as ZodError);
      expect(issues[0].path).toBe('user.address.city');
    }
  });

  it('formats array index path', () => {
    const schema = z.object({ items: z.array(z.string()) });
    try {
      schema.parse({ items: [123] });
    } catch (e) {
      const issues = formatZodIssues(e as ZodError);
      expect(issues[0].path).toBe('items.0');
    }
  });

  it('formats multiple issues', () => {
    const schema = z.object({ a: z.string(), b: z.number() });
    try {
      schema.parse({ a: 123, b: 'wrong' });
    } catch (e) {
      const issues = formatZodIssues(e as ZodError);
      expect(issues.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('returns empty array for no issues', () => {
    const err = new ZodError([]);
    expect(formatZodIssues(err)).toEqual([]);
  });
});
