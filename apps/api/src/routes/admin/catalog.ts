import { Hono } from 'hono';

import type { AppBindings } from '../../app.js';
import * as catalogRepo from '../../repositories/catalog.repository.js';
import { ingestionService } from '../../services/ingestion.service.js';
import { query } from '../../lib/db.js';

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

catalogHandler.post('/enqueue-gaps', async (c) => {
  const limit = Math.min(parseInt(c.req.query('limit') ?? '25', 10), 100);
  const page = await catalogRepo.listCatalogCoverage({ limit, offset: 0, missingOnly: true });

  const jobs: Array<{ cardId: string; jobId: string; sourceUrl: string }> = [];

  for (const row of page.rows) {
    if (!row.benefit_guide_url) continue;

    const job = await ingestionService.createIngestionJob({
      cardId: row.card_id,
      sourceUrl: row.benefit_guide_url,
      priority: 1,
    });

    jobs.push({
      cardId: row.card_id,
      jobId: job.id,
      sourceUrl: row.benefit_guide_url,
    });
  }

  return c.json({
    data: {
      enqueued: jobs.length,
      skippedMissingGuide: page.rows.filter((r) => !r.benefit_guide_url).length,
      jobs,
    },
    requestId: c.get('requestId'),
  });
});

catalogHandler.get('/card-meta/:cardId', async (c) => {
  const cardId = c.req.param('cardId');
  const result = await query<{ card_id: string; name: string; issuer_name: string | null; benefit_guide_url: string | null }>(
    `SELECT c.card_id, c.name, i.name AS issuer_name, c.benefit_guide_url
     FROM cards c
     LEFT JOIN issuers i ON i.id = c.issuer_id
     WHERE c.card_id = $1
     LIMIT 1`,
    [cardId],
  );

  const row = result.rows[0];
  if (!row) {
    return c.json({ error: { code: 'NOT_FOUND', message: 'Card not found' }, requestId: c.get('requestId') }, 404);
  }

  return c.json({ data: row, requestId: c.get('requestId') });
});
