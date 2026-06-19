import { createMiddleware } from 'hono/factory';
import type { AppBindings } from '../app.js';
import { trackEvent } from '../lib/observability.js';

/** Emit request-level metrics to PostHog after each response. */
export const metrics = createMiddleware<AppBindings>(async (c, next) => {
  const start = Date.now();
  await next();

  if (process.env.NODE_ENV === 'test') return;

  const durationMs = Date.now() - start;
  const status = c.res.status;

  void trackEvent(
    'api.request',
    {
      path: c.req.path,
      method: c.req.method,
      status,
      durationMs,
      orgId: c.get('orgId'),
      plan: c.get('orgPlan'),
    },
    c.get('orgId') ?? 'anonymous',
  );
});
