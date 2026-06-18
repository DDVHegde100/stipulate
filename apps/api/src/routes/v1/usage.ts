import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import type { AppBindings } from '../../app.js';
import { getUsageSummary, COST_PER_CALL_MICROS } from '../../repositories/usage.repository.js';

export const usageHandler = new Hono<AppBindings>();

usageHandler.get('/', async (c) => {
  const orgId = c.get('orgId');
  if (!orgId) {
    throw new HTTPException(403, { message: 'Org context required for usage' });
  }

  const since = new Date();
  since.setUTCDate(1);
  since.setUTCHours(0, 0, 0, 0);

  const summary = await getUsageSummary(orgId, since.toISOString());

  return c.json({
    data: {
      periodStart: since.toISOString(),
      totalCalls: summary.totalCalls,
      totalCostUsd: summary.totalCostMicros / 1_000_000,
      costPerCallUsd: COST_PER_CALL_MICROS / 1_000_000,
      byType: summary.byType,
      plan: c.get('orgPlan') ?? 'free',
    },
    requestId: c.get('requestId'),
  });
});
