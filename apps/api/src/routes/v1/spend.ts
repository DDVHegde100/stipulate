import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

import type { AppBindings } from '../../app.js';
import {
  annualPeriodStart,
  getCapHeadroomForUser,
  getSpendSummaryForUser,
  importStatementSpend,
  trackCategorySpend,
} from '../../repositories/spend.repository.js';
import { resolveConsumerUserId } from '../../lib/consumer-context.js';

const SpendQuerySchema = z.object({
  user_ref: z.string().min(1).default('default'),
  card_ids: z.string().optional(),
});

const TrackSpendSchema = z.object({
  userRef: z.string().min(1).optional(),
  cardId: z.string().min(1),
  category: z.string().min(1),
  amountMinor: z.number().int().positive(),
  capPeriod: z.string().default('annual'),
  source: z.string().optional(),
});

export const spendHandler = new Hono<AppBindings>();

spendHandler.get('/summary', async (c) => {
  const orgId = c.get('orgId');
  const parsed = SpendQuerySchema.safeParse({
    user_ref: c.req.query('user_ref'),
    card_ids: c.req.query('card_ids'),
  });

  if (!parsed.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, requestId: c.get('requestId') },
      422,
    );
  }

  const cardIds = parsed.data.card_ids
    ? parsed.data.card_ids.split(',').map((id) => id.trim()).filter(Boolean)
    : [];

  if (cardIds.length === 0) {
    throw new HTTPException(400, { message: 'card_ids query param is required' });
  }

  const periodStart = annualPeriodStart();
  const rows = await getSpendSummaryForUser({
    orgId,
    userRef: parsed.data.user_ref,
    cardIds,
    periodStart,
  });

  return c.json({
    data: {
      userRef: parsed.data.user_ref,
      periodStart,
      caps: rows.map((row) => ({
        cardId: row.card_id,
        category: row.category,
        capPeriod: row.cap_period,
        spentMinor: row.spent_cents,
      })),
    },
    requestId: c.get('requestId'),
  });
});

spendHandler.get('/caps', async (c) => {
  const orgId = c.get('orgId');
  const parsed = SpendQuerySchema.safeParse({
    user_ref: c.req.query('user_ref'),
    card_ids: c.req.query('card_ids'),
  });

  if (!parsed.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, requestId: c.get('requestId') },
      422,
    );
  }

  const cardIds = parsed.data.card_ids
    ? parsed.data.card_ids.split(',').map((id) => id.trim()).filter(Boolean)
    : [];

  if (cardIds.length === 0) {
    throw new HTTPException(400, { message: 'card_ids query param is required' });
  }

  const periodStart = annualPeriodStart();
  const caps = await getCapHeadroomForUser({
    orgId,
    userRef: parsed.data.user_ref,
    cardIds,
    periodStart,
  });

  return c.json({
    data: {
      userRef: parsed.data.user_ref,
      periodStart,
      caps,
    },
    requestId: c.get('requestId'),
  });
});

spendHandler.post('/track', async (c) => {
  const orgId = c.get('orgId');
  const body: unknown = await c.req.json().catch(() => {
    throw new HTTPException(400, { message: 'Request body must be valid JSON' });
  });

  const parsed = TrackSpendSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, requestId: c.get('requestId') },
      422,
    );
  }

  const sessionUser = await resolveConsumerUserId(c);
  const userRef = parsed.data.userRef ?? sessionUser ?? 'default';
  const periodStart = annualPeriodStart();
  const result = await trackCategorySpend({
    orgId,
    userRef,
    cardId: parsed.data.cardId,
    category: parsed.data.category,
    capPeriod: parsed.data.capPeriod,
    periodStart,
    amountMinor: parsed.data.amountMinor,
    source: parsed.data.source,
  });

  return c.json({
    data: {
      userRef,
      cardId: parsed.data.cardId,
      category: parsed.data.category,
      periodStart,
      spentMinor: result.spentMinor,
    },
    requestId: c.get('requestId'),
  });
});

const ImportSpendSchema = z.object({
  userRef: z.string().min(1).optional(),
  csv: z.string().min(1).optional(),
  rows: z
    .array(
      z.object({
        cardId: z.string().min(1),
        category: z.string().min(1),
        amountMinor: z.number().int().positive(),
        capPeriod: z.string().optional(),
      }),
    )
    .optional(),
});

function parseSpendCsv(csv: string): Array<{
  cardId: string;
  category: string;
  amountMinor: number;
}> {
  return csv
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [cardId, category, amountMinor] = line.split(',').map((part) => part.trim());
      return {
        cardId,
        category,
        amountMinor: Number.parseInt(amountMinor ?? '0', 10),
      };
    })
    .filter((row) => row.cardId && row.category && row.amountMinor > 0);
}

spendHandler.post('/import', async (c) => {
  const orgId = c.get('orgId');
  const body: unknown = await c.req.json().catch(() => {
    throw new HTTPException(400, { message: 'Request body must be valid JSON' });
  });

  const parsed = ImportSpendSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, requestId: c.get('requestId') },
      422,
    );
  }

  const sessionUser = await resolveConsumerUserId(c);
  const userRef = parsed.data.userRef ?? sessionUser ?? 'default';
  const rows =
    parsed.data.rows ??
    (parsed.data.csv ? parseSpendCsv(parsed.data.csv) : []);

  if (rows.length === 0) {
    throw new HTTPException(400, { message: 'rows or csv is required' });
  }

  const result = await importStatementSpend({
    orgId,
    userRef,
    rows,
  });

  return c.json({
    data: {
      userRef,
      imported: result.imported,
      totalMinor: result.totalMinor,
    },
    requestId: c.get('requestId'),
  });
});
