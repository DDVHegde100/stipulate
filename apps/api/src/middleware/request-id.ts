import { createMiddleware } from 'hono/factory';
import { randomUUID } from 'node:crypto';

import type { AppBindings } from '../app.js';

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Assigns a unique request identifier to every inbound request.
 * Accepts an existing ID from the client when present and valid.
 */
export const requestId = createMiddleware<AppBindings>(async (c, next) => {
  const incoming = c.req.header(REQUEST_ID_HEADER);
  const id = incoming && incoming.trim().length > 0 ? incoming.trim() : randomUUID();

  c.set('requestId', id);
  c.header(REQUEST_ID_HEADER, id);

  await next();
});

export function getRequestId(c: { get: (key: 'requestId') => string }): string {
  return c.get('requestId');
}
