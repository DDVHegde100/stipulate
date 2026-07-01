import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

import type { AppBindings } from '../app.js';
import { loadEnv } from '../config/env.js';

const DEFAULT_MAX_BYTES = 1_048_576; // 1 MiB
const PRODUCTION_MAX_BYTES = 512_000; // 512 KiB

/** Reject oversized request bodies before route handlers parse JSON. */
export const bodyLimit = createMiddleware<AppBindings>(async (c, next) => {
  const env = loadEnv();
  const maxBytes =
    env.NODE_ENV === 'production' ? PRODUCTION_MAX_BYTES : DEFAULT_MAX_BYTES;

  const contentLength = c.req.header('content-length');
  if (contentLength) {
    const length = Number.parseInt(contentLength, 10);
    if (Number.isFinite(length) && length > maxBytes) {
      throw new HTTPException(413, { message: 'Request body too large' });
    }
  }

  await next();
});
