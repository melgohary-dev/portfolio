import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import { z } from 'zod';
import { tenantScoped, type Database } from '@saas/db';
import { ApiErrorSchema, OrderCreateSchema, OrderSchema, OrderStatus } from '@saas/shared';
import type { AppEnv } from '../logger.js';
import { publishOrderEvent, subscribeToOrders } from '../realtime.js';

export function registerOrders(app: OpenAPIHono<AppEnv>, db: Database) {
  const createOrderRoute = createRoute({
    method: 'post',
    path: '/api/orders',
    tags: ['orders'],
    request: {
      body: {
        content: {
          'application/json': { schema: OrderCreateSchema },
        },
      },
    },
    responses: {
      201: {
        description: 'Created order',
        content: { 'application/json': { schema: OrderSchema } },
      },
      400: {
        description: 'Validation error',
        content: { 'application/json': { schema: ApiErrorSchema } },
      },
      401: {
        description: 'Missing or invalid bearer token',
        content: { 'application/json': { schema: ApiErrorSchema } },
      },
      500: {
        description: 'Internal server error',
        content: { 'application/json': { schema: ApiErrorSchema } },
      },
    },
  });

  app.openapi(createOrderRoute, async (c) => {
    const tenantId = c.get('tenantId');
    const userId = c.get('userId');
    const body = c.req.valid('json');
    const order = await tenantScoped(db, tenantId).orders.create({ ...body, createdBy: userId });
    publishOrderEvent(tenantId, { type: 'order.created', order });
    return c.json(order, 201);
  });

  // SSE fan-out route. EventSource reconnects automatically, so the heartbeat
  // (`: ping` every 15s) keeps intermediaries from timing the connection out;
  // the `start()` abort guard closes dead connections immediately. Tenant
  // identity comes from the verified bearer token (authMiddleware), never from
  // a client header. Kept as a raw route because the infinite stream does not
  // fit the OpenAPI response model (see index.ts).
  app.get('/api/orders/stream', (c) => {
    const tenantId = c.get('tenantId');
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        if (c.req.raw.signal.aborted) {
          try {
            controller.close();
          } catch {
            /* already closed */
          }
          return;
        }
        const heartbeat = setInterval(() => {
          controller.enqueue(encoder.encode(': ping\n\n'));
        }, 15000);
        const unsubscribe = subscribeToOrders(
          tenantId,
          (chunk) => {
            controller.enqueue(encoder.encode(chunk));
          },
          c.req.raw.signal,
        );
        c.req.raw.signal.addEventListener('abort', () => {
          clearInterval(heartbeat);
          unsubscribe();
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        });
      },
    });
    return new Response(stream, {
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      },
    });
  });

  const listOrdersRoute = createRoute({
    method: 'get',
    path: '/api/orders',
    tags: ['orders'],
    request: {
      query: z.object({
        limit: z.coerce.number().int().min(1).max(200).default(50),
        offset: z.coerce.number().int().min(0).default(0),
        status: OrderStatus.optional(),
      }),
    },
    responses: {
      200: {
        description: 'List of orders for the tenant',
        content: {
          'application/json': {
            schema: z.object({
              orders: z.array(OrderSchema),
              total: z.number().int().nonnegative(),
            }),
          },
        },
      },
      400: {
        description: 'Validation error',
        content: { 'application/json': { schema: ApiErrorSchema } },
      },
      401: {
        description: 'Missing or invalid bearer token',
        content: { 'application/json': { schema: ApiErrorSchema } },
      },
    },
  });

  app.openapi(listOrdersRoute, async (c) => {
    const tenantId = c.get('tenantId');
    const { limit, offset, status } = c.req.valid('query');
    const result = await tenantScoped(db, tenantId).orders.list({ limit, offset, status });
    return c.json({ orders: result.rows, total: result.total }, 200);
  });
}
