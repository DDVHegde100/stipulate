import { Hono } from 'hono';

import type { AppBindings } from '../../app.js';
import * as catalogRepo from '../../repositories/catalog.repository.js';

export const catalogHandler = new Hono<AppBindings>();

catalogHandler.get('/coverage', async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') ?? '50', 10), 200);
  const offset = parseInt(c.req.query('offset') ?? '0', 10);
  const missingOnly = c.req.query('missing') === 'true';

  const [summary, page] = await Promise.all([
    catalogRepo.getCatalogCoverageSummary(),
    catalogRepo.listCatalogCoverage({ limit, offset, missingOnly }),
  ]);

  return c.json({
    data: {
      summary,
      cards: page.rows,
      pagination: {
        limit,
        offset,
        total: page.total,
        hasMore: offset + page.rows.length < page.total,
      },
    },
    requestId: c.get('requestId'),
  });
});

catalogHandler.get('/coverage/gaps', async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') ?? '100', 10), 500);
  const page = await catalogRepo.listCatalogCoverage({ limit, offset: 0, missingOnly: true });

  return c.json({
    data: {
      missingBenefits: page.rows,
      count: page.total,
    },
    requestId: c.get('requestId'),
  });
});
