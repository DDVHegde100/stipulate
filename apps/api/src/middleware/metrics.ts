import { createMiddleware } from 'hono/factory';
import type { AppBindings } from '../app.js';
import { trackEvent, captureException } from '../lib/observability.js';
import { recordRouteLatency, getRouteP99LimitMs } from '../lib/slo-tracker.js';

/** Emit request-level metrics to PostHog after each response. */
export const metrics = createMiddleware<AppBindings>(async (c, next) => {
  const start = Date.now();
  await next();

  const durationMs = Date.now() - start;
  const status = c.res.status;
  const path = c.req.path;

  if (path.includes('/route') && c.req.method === 'POST' && status < 500) {
    recordRouteLatency(durationMs);
    const p99Limit = getRouteP99LimitMs();
    if (durationMs > p99Limit * 2) {
      void captureException(new Error(`Route latency SLO breach: ${durationMs}ms`), {
        path,
        durationMs,
        p99Limit,
        orgId: c.get('orgId'),
      });
    }
  }

  if (process.env.NODE_ENV === 'test') return;

  void trackEvent(
    'api.request',
    {
      path,
      method: c.req.method,
      status,
      durationMs,
      orgId: c.get('orgId'),
      plan: c.get('orgPlan'),
    },
    c.get('orgId') ?? 'anonymous',
  );
});
