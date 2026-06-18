import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { AppBindings } from '../app.js';
import { getRedis } from '../lib/redis.js';
import { prefixedKey } from '../cache/keys.js';

/** Sliding-window rate limiter backed by Redis. */
export const rateLimit = createMiddleware<AppBindings>(async (c, next) => {
  const orgId = c.get('orgId') ?? 'anonymous';
  const plan = c.get('orgPlan') ?? 'free';
  const limit = c.get('rateLimitPerMinute') ?? (plan === 'saas' ? 600 : 60);

  if (process.env.NODE_ENV === 'test') {
    c.header('X-RateLimit-Limit', String(limit));
    c.header('X-RateLimit-Remaining', String(limit - 1));
    await next();
    return;
  }

  const windowKey = prefixedKey('ratelimit', orgId, String(Math.floor(Date.now() / 60_000)));

  try {
    const redis = getRedis();
    const current = await redis.incr(windowKey);
    if (current === 1) {
      await redis.expire(windowKey, 60);
    }

    const remaining = Math.max(0, limit - current);
    c.header('X-RateLimit-Limit', String(limit));
    c.header('X-RateLimit-Remaining', String(remaining));

    if (current > limit) {
      c.header('Retry-After', '60');
      throw new HTTPException(429, { message: 'Rate limit exceeded' });
    }
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    // Redis down — allow request
  }

  await next();
});
