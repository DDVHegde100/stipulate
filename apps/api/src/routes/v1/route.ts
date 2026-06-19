import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import type { AppBindings } from '../../app.js';
import {
  RoutingServiceError,
  RouteRequestSchema,
  routePurchase,
} from '../../services/routing.service.js';
import { recordApiUsage } from '../../services/metering.service.js';
import { batchRouteHandler } from './route/batch.js';
import { idempotency } from '../../middleware/idempotency.js';

export const routeHandler = new Hono<AppBindings>();

routeHandler.use('*', idempotency);

routeHandler.route('/batch', batchRouteHandler);

routeHandler.post('/', async (c) => {
  const requestId = c.get('requestId');
  const start = Date.now();
  const body: unknown = await c.req.json().catch(() => {
    throw new HTTPException(400, { message: 'Request body must be valid JSON' });
  });

  const parsed = RouteRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid route request',
          details: parsed.error.flatten(),
        },
        requestId,
      },
      422,
    );
  }

  try {
    const result = await routePurchase(parsed.data, requestId, {
      orgId: c.get('orgId'),
    });

    void recordApiUsage('route', {
      orgId: c.get('orgId'),
      apiKeyId: c.get('apiKeyId'),
      requestId,
    }, {
      amountCents: parsed.data.amount.amountMinor,
      latencyMs: Date.now() - start,
      status: 'success',
    });

    return c.json({
      data: result,
      requestId,
    });
  } catch (error: unknown) {
    void recordApiUsage('route', {
      orgId: c.get('orgId'),
      apiKeyId: c.get('apiKeyId'),
      requestId,
    }, { latencyMs: Date.now() - start, status: 'error' });

    if (error instanceof RoutingServiceError) {
      const status =
        error.code === 'INVALID_REQUEST' ? 422 : error.code === 'NO_CARDS' ? 400 : 500;

      return c.json(
        {
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
          requestId,
        },
        status,
      );
    }

    throw error;
  }
});
