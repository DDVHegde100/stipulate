import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ProxyPayRequestSchema } from '@stipulate/schema';

import type { AppBindings } from '../../app.js';
import { proxyPayPurchase } from '../../services/proxy-pay.service.js';
import { getFeatureFlags } from '../../lib/feature-flags.js';
import { recordApiUsage } from '../../services/metering.service.js';
import { idempotency } from '../../middleware/idempotency.js';
import { ProxyPayError } from '../../services/proxy-pay.service.js';

export const proxyPayHandler = new Hono<AppBindings>();

proxyPayHandler.use('*', idempotency);

proxyPayHandler.post('/', async (c) => {
  if (!getFeatureFlags().proxyPay) {
    throw new HTTPException(404, { message: 'Proxy pay is not enabled' });
  }

  const requestId = c.get('requestId');
  const start = Date.now();

  const body: unknown = await c.req.json().catch(() => {
    throw new HTTPException(400, { message: 'Request body must be valid JSON' });
  });

  const parsed = ProxyPayRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, requestId }, 422);
  }

  try {
    const result = await proxyPayPurchase(parsed.data, requestId, { orgId: c.get('orgId') });

    void recordApiUsage('route', {
      orgId: c.get('orgId'),
      apiKeyId: c.get('apiKeyId'),
      requestId,
    }, { latencyMs: Date.now() - start, metadata: { proxyPay: true } });

    return c.json({ data: result, requestId });
  } catch (error) {
    if (error instanceof ProxyPayError) {
      return c.json(
        { error: { code: error.code, message: error.message }, requestId },
        error.code === 'PAYMENT_TOKEN_REQUIRED' ? 422 : 400,
      );
    }
    throw error;
  }
});
