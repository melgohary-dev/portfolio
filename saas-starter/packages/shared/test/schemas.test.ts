import { describe, expect, it } from 'vitest';
import {
  OrderCreateSchema,
  OrderSchema,
  OrderStatus,
  Plan,
  LineItemSchema,
} from '../src/schemas.js';

describe('OrderCreateSchema', () => {
  it('accepts a minimal valid order', () => {
    const result = OrderCreateSchema.safeParse({
      customerName: 'Alice',
      customerEmail: 'alice@example.com',
      amountCents: 1000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe('USD');
      expect(result.data.lineItems).toEqual([]);
    }
  });

  it('rejects empty customer name', () => {
    const result = OrderCreateSchema.safeParse({
      customerName: '',
      customerEmail: 'alice@example.com',
      amountCents: 1000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = OrderCreateSchema.safeParse({
      customerName: 'Alice',
      customerEmail: 'not-an-email',
      amountCents: 1000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative amounts', () => {
    const result = OrderCreateSchema.safeParse({
      customerName: 'Alice',
      customerEmail: 'alice@example.com',
      amountCents: -5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-3-letter currency', () => {
    const result = OrderCreateSchema.safeParse({
      customerName: 'Alice',
      customerEmail: 'alice@example.com',
      amountCents: 1000,
      currency: 'USDD',
    });
    expect(result.success).toBe(false);
  });

  it('accepts line items and validates quantity', () => {
    const ok = OrderCreateSchema.safeParse({
      customerName: 'Alice',
      customerEmail: 'alice@example.com',
      amountCents: 2000,
      currency: 'EUR',
      lineItems: [{ sku: 'A', name: 'Widget', quantity: 2, unitPriceCents: 1000 }],
    });
    expect(ok.success).toBe(true);
    const bad = OrderCreateSchema.safeParse({
      customerName: 'Alice',
      customerEmail: 'alice@example.com',
      amountCents: 2000,
      lineItems: [{ sku: 'A', name: 'Widget', quantity: 0, unitPriceCents: 1000 }],
    });
    expect(bad.success).toBe(false);
  });
});

describe('OrderSchema', () => {
  it('requires id, tenantId, createdBy and status', () => {
    const result = OrderSchema.safeParse({
      customerName: 'Alice',
      customerEmail: 'alice@example.com',
      amountCents: 1000,
      status: 'paid',
      id: 'b1f2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      tenantId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5e',
      createdBy: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown status', () => {
    const result = OrderSchema.safeParse({
      customerName: 'Alice',
      customerEmail: 'alice@example.com',
      amountCents: 1000,
      status: 'shipped',
      id: 'b1f2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      tenantId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5e',
      createdBy: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    expect(result.success).toBe(false);
  });
});

describe('enums', () => {
  it('exposes exactly the expected order statuses', () => {
    expect(OrderStatus.enum).toEqual({
      pending: 'pending',
      paid: 'paid',
      refunded: 'refunded',
      failed: 'failed',
    });
  });

  it('exposes exactly the expected plans', () => {
    expect(Plan.enum).toEqual({ free: 'free', pro: 'pro' });
  });

  it('validates a line item', () => {
    expect(LineItemSchema.safeParse({ sku: 'S', name: 'n', quantity: 1, unitPriceCents: 10 }).success).toBe(true);
    expect(LineItemSchema.safeParse({ sku: 'S', name: 'n', quantity: 1 }).success).toBe(false);
  });
});
