import { createMiddleware } from 'hono/factory';

import type { AppBindings } from '../app.js';
import { createChildLogger } from '../lib/logger.js';

/**
 * Records request duration and emits structured access logs.
 */
export const timing = createMiddleware<AppBindings>(async (c, next) => {
  const start = performance.now();
  const requestId = c.get('requestId');
  const method = c.req.method;
  const path = c.req.path;
  const log = createChildLogger({ requestId, component: 'http' });

  log.debug({ method, path }, 'Request started');

  try {
    await next();
  } finally {
    const durationMs = Number((performance.now() - start).toFixed(2));
    const status = c.res.status;

    c.header('x-response-time', `${durationMs}ms`);

    const level =
      status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

    log[level](
      {
        method,
        path,
        status,
        durationMs,
        userAgent: c.req.header('user-agent'),
      },
      'Request completed',
    );
  }
});
