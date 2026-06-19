import type { MiddlewareHandler } from 'hono';

import { getCachedJson, setCachedJson } from '../lib/redis.js';

const TTL_SECONDS = 86_400;

interface CachedResponse {
  status: number;
  body: unknown;
}

const testCache = new Map<string, CachedResponse>();

/** Reset in-memory idempotency cache — tests only. */
export function resetTestIdempotencyCache(): void {
  testCache.clear();
}

export const idempotency: MiddlewareHandler = async (c, next) => {
  if (c.req.method !== 'POST') {
    await next();
    return;
  }

  const key = c.req.header('Idempotency-Key');
  if (!key || key.length < 8 || key.length > 128) {
    await next();
    return;
  }

  const orgId = c.get('orgId') ?? 'default';
  const cacheKey = `idempotency:${orgId}:${key}`;

  if (process.env.NODE_ENV === 'test') {
    const cached = testCache.get(cacheKey);
    if (cached) {
      return c.json(cached.body as Record<string, unknown>, cached.status as 200 | 201 | 422);
    }
    await next();
    if (c.res.status < 500) {
      try {
        const clone = c.res.clone();
        const body = await clone.json();
        testCache.set(cacheKey, { status: c.res.status, body });
      } catch {
        // ignore
      }
    }
    return;
  }

  try {
    const cached = await getCachedJson<CachedResponse>(cacheKey);
    if (cached) {
      return c.json(cached.body as Record<string, unknown>, cached.status as 200 | 201 | 422);
    }
  } catch {
    // Redis unavailable — proceed without idempotency cache
  }

  await next();

  if (c.res.status >= 500) return;

  try {
    const clone = c.res.clone();
    const body = await clone.json();
    await setCachedJson(cacheKey, { status: c.res.status, body }, TTL_SECONDS);
  } catch {
    // ignore cache write failures
  }
};
