import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

import type { AppBindings } from '../../app.js';
import * as valuationRepo from '../../repositories/valuation.repository.js';

const OverrideSchema = z.object({
  program_id: z.string().min(1),
  cents_per_point: z.number().positive().max(10),
});

export const valuationsHandler = new Hono<AppBindings>();

valuationsHandler.get('/', async (c) => {
  const programs = await valuationRepo.loadValuationPrograms();
  const orgId = c.get('orgId');
  const overrides = orgId ? await valuationRepo.listValuationOverrides(orgId) : [];

  return c.json({
    data: { programs, overrides },
    requestId: c.get('requestId'),
  });
});

valuationsHandler.put('/overrides', async (c) => {
  const orgId = c.get('orgId');
  if (!orgId) throw new HTTPException(403, { message: 'Org context required' });

  const body: unknown = await c.req.json().catch(() => {
    throw new HTTPException(400, { message: 'Request body must be valid JSON' });
  });

  const parsed = OverrideSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, requestId: c.get('requestId') }, 422);
  }

  const override = await valuationRepo.upsertValuationOverride({
    orgId,
    programId: parsed.data.program_id,
    centsPerPoint: parsed.data.cents_per_point,
  });

  return c.json({ data: override, requestId: c.get('requestId') });
});
