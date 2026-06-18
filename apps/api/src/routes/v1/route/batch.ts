import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { BatchRouteRequestSchema } from '@stipulate/schema';

import type { AppBindings } from '../../../app.js';
import {
  RoutingServiceError,
  routeBatchPurchases,
} from '../../../services/routing.service.js';
import { recordApiUsage } from '../../../services/metering.service.js';

export const batchRouteHandler = new Hono<AppBindings>();

batchRouteHandler.post('/', async (c) => {
  const requestId = c.get('requestId');
  const start = Date.now();

  const body: unknown = await c.req.json().catch(() => {
    throw new HTTPException(400, { message: 'Request body must be valid JSON' });
  });

  const parsed = BatchRouteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid batch route request',
          details: parsed.error.flatten(),
        },
        requestId,
      },
      422,
    );
  }

  try {
    const result = await routeBatchPurchases(parsed.data, requestId);

    void recordApiUsage('batch_route', {
      orgId: c.get('orgId'),
      apiKeyId: c.get('apiKeyId'),
      requestId,
    }, {
      latencyMs: Date.now() - start,
      status: 'success',
      metadata: { total: result.total, succeeded: result.succeeded },
    });

    return c.json({ data: result, requestId });
  } catch (error: unknown) {
    void recordApiUsage('batch_route', {
      orgId: c.get('orgId'),
      apiKeyId: c.get('apiKeyId'),
      requestId,
    }, { latencyMs: Date.now() - start, status: 'error' });

    if (error instanceof RoutingServiceError) {
      return c.json(
        {
          error: { code: error.code, message: error.message, details: error.details },
          requestId,
        },
        error.code === 'INVALID_REQUEST' ? 422 : 400,
      );
    }

    throw error;
  }
});
