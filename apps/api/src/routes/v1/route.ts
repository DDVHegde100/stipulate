import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import type { AppBindings } from '../../app.js';
import {
  RoutingServiceError,
  routeRequestSchema,
  routingService,
} from '../../services/routing.service.js';

export const routeHandler = new Hono<AppBindings>();

routeHandler.post('/', async (c) => {
  const requestId = c.get('requestId');
  const body: unknown = await c.req.json().catch(() => {
    throw new HTTPException(400, { message: 'Request body must be valid JSON' });
  });

  const parsed = routeRequestSchema.safeParse(body);

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
    const result = await routingService.route(parsed.data, requestId);

    return c.json({
      data: result,
      requestId,
    });
  } catch (error: unknown) {
    if (error instanceof RoutingServiceError) {
      const status = error.code === 'INVALID_REQUEST' ? 422 : 400;

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
