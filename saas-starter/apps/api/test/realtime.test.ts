import { describe, it, expect, beforeEach } from 'vitest';
import { subscribeToOrders, publishOrderEvent } from '../src/realtime.js';

function makeController() {
  return new AbortController();
}

describe('subscribeToOrders / publishOrderEvent', () => {
  it('delivers event to a subscriber', () => {
    const ctrl = makeController();
    const chunks: string[] = [];
    subscribeToOrders('t1', (c) => chunks.push(c), ctrl.signal);

    publishOrderEvent('t1', { type: 'created', order: { id: 'o1' } });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toContain('event: created');
    expect(chunks[0]).toContain('"id":"o1"');
  });

  it('does not deliver to wrong tenant', () => {
    const ctrl = makeController();
    const chunks: string[] = [];
    subscribeToOrders('t1', (c) => chunks.push(c), ctrl.signal);

    publishOrderEvent('t2', { type: 'created', order: {} });

    expect(chunks).toHaveLength(0);
  });

  it('delivers to multiple subscribers', () => {
    const ctrl1 = makeController();
    const ctrl2 = makeController();
    const chunks1: string[] = [];
    const chunks2: string[] = [];
    subscribeToOrders('t1', (c) => chunks1.push(c), ctrl1.signal);
    subscribeToOrders('t1', (c) => chunks2.push(c), ctrl2.signal);

    publishOrderEvent('t1', { type: 'updated', order: { id: 'o2' } });

    expect(chunks1).toHaveLength(1);
    expect(chunks2).toHaveLength(1);
  });

  it('unsubscribe stops delivery', () => {
    const ctrl = makeController();
    const chunks: string[] = [];
    const unsub = subscribeToOrders('t1', (c) => chunks.push(c), ctrl.signal);

    publishOrderEvent('t1', { type: 'created', order: {} });
    expect(chunks).toHaveLength(1);

    unsub();
    publishOrderEvent('t1', { type: 'created', order: {} });
    expect(chunks).toHaveLength(1);
  });

  it('does not deliver after abort', () => {
    const ctrl = makeController();
    const chunks: string[] = [];
    subscribeToOrders('t1', (c) => chunks.push(c), ctrl.signal);

    ctrl.abort();
    publishOrderEvent('t1', { type: 'created', order: {} });

    expect(chunks).toHaveLength(0);
  });

  it('cleans up dead subscribers on publish', () => {
    const ctrl1 = makeController();
    const ctrl2 = makeController();
    const chunks2: string[] = [];
    subscribeToOrders('t1', () => { throw new Error('dead'); }, ctrl1.signal);
    subscribeToOrders('t1', (c) => chunks2.push(c), ctrl2.signal);

    // The dead subscriber should be dropped, but ctrl2 still works
    publishOrderEvent('t1', { type: 'created', order: {} });
    expect(chunks2).toHaveLength(1);
  });

  it('SSE format has event and data lines', () => {
    const ctrl = makeController();
    const chunks: string[] = [];
    subscribeToOrders('t1', (c) => chunks.push(c), ctrl.signal);

    publishOrderEvent('t1', { type: 'paid', order: { total: 100 } });

    expect(chunks[0]).toMatch(/^event: paid\n/);
    expect(chunks[0]).toMatch(/\ndata: /);
    expect(chunks[0]).toMatch(/\n\n$/);
  });

  it('publish to non-existent tenant is a no-op', () => {
    publishOrderEvent('nonexistent', { type: 'created', order: {} });
  });
});
