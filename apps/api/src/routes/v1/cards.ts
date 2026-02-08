import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { BenefitLookupQuerySchema } from '@stipulate/schema';

import type { AppBindings } from '../../app.js';
import { BenefitServiceError, benefitService } from '../../services/benefit.service.js';

export const cardsHandler = new Hono<AppBindings>();

cardsHandler.get('/:cardId/benefits', async (c) => {
  const requestId = c.get('requestId');
  const cardId = c.req.param('cardId');

  const queryParsed = BenefitLookupQuerySchema.safeParse({
    as_of: c.req.query('as_of'),
    version: c.req.query('version'),
    include_history: c.req.query('include_history'),
  });

  if (!queryParsed.success) {
    return c.json(
      {
        error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters', details: queryParsed.error.flatten() },
        requestId,
      },
      422,
    );
  }

  try {
    const result = await benefitService.getCardBenefits({
      cardId,
      asOf: queryParsed.data.as_of,
      version: queryParsed.data.version,
    });

    return c.json({ data: result, requestId });
  } catch (error) {
    if (error instanceof BenefitServiceError) {
      const status = error.code === 'CARD_NOT_FOUND' ? 404 : error.code === 'VERSION_NOT_FOUND' ? 404 : 422;
      throw new HTTPException(status, { message: error.message });
    }
    throw error;
  }
});

cardsHandler.get('/:cardId/benefits/versions/:version', async (c) => {
  const requestId = c.get('requestId');
  const cardId = c.req.param('cardId');
  const version = parseInt(c.req.param('version'), 10);

  if (Number.isNaN(version) || version < 1) {
    throw new HTTPException(422, { message: 'version must be a positive integer' });
  }

  try {
    const result = await benefitService.getCardBenefits({ cardId, version });
    return c.json({ data: result, requestId });
  } catch (error) {
    if (error instanceof BenefitServiceError) {
      throw new HTTPException(error.code === 'CARD_NOT_FOUND' ? 404 : 404, { message: error.message });
    }
    throw error;
  }
});
