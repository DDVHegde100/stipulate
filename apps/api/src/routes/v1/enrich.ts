import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import type { AppBindings } from '../../app.js';
import {
  EnrichServiceError,
  EnrichRequestSchema,
  enrichMerchant,
  submitCorrection,
  MccCorrectionRequestSchema,
} from '../../services/enrich.service.js';
import { idempotency } from '../../middleware/idempotency.js';

export const enrichHandler = new Hono<AppBindings>();

enrichHandler.use('*', idempotency);

enrichHandler.post('/', async (c) => {
  const requestId = c.get('requestId');
  const body: unknown = await c.req.json().catch(() => {
    throw new HTTPException(400, { message: 'Request body must be valid JSON' });
  });

  const parsed = EnrichRequestSchema.safeParse(body);

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
    const result = await enrichMerchant(parsed.data, requestId);
    return c.json({ data: result, requestId });
  } catch (error) {
    if (error instanceof EnrichServiceError) {
      const status = error.code === 'RECEIPT_PARSE_FAILED' ? 422 : 400;
      return c.json(
        {
          error: { code: error.code, message: error.message, details: error.details },
          requestId,
        },
        status,
      );
    }
    throw error;
  }
});

enrichHandler.post('/corrections', async (c) => {
  const requestId = c.get('requestId');
  const body: unknown = await c.req.json().catch(() => {
    throw new HTTPException(400, { message: 'Request body must be valid JSON' });
  });

  const parsed = MccCorrectionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: { code: 'VALIDATION_ERROR', message: 'Invalid correction', details: parsed.error.flatten() },
        requestId,
      },
      422,
    );
  }

  try {
    const result = await submitCorrection(parsed.data);
    return c.json({ data: result, requestId }, 201);
  } catch (error) {
    if (error instanceof EnrichServiceError) {
      return c.json(
        { error: { code: error.code, message: error.message }, requestId },
        422,
      );
    }
    throw error;
  }
});
