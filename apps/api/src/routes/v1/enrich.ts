import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import type { AppBindings } from '../../app.js';
import {
  RoutingServiceError,
  enrichRequestSchema,
  routingService,
} from '../../services/routing.service.js';

export const enrichHandler = new Hono<AppBindings>();

enrichHandler.post('/', async (c) => {
  const requestId = c.get('requestId');
  const body: unknown = await c.req.json().catch(() => {
    throw new HTTPException(400, { message: 'Request body must be valid JSON' });
  });

  const parsed = enrichRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid enrich request',
          details: parsed.error.flatten(),
        },
        requestId,
      },
      422,
    );
  }

  try {
    const result = await routingService.enrich(parsed.data, requestId);

    return c.json({
      data: result,
      requestId,
    });
  } catch (error) {
    if (error instanceof RoutingServiceError) {
      return c.json(
        {
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
          requestId,
        },
        422,
      );
    }

    throw error;
  }
});
