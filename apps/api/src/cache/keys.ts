import { createHash } from 'node:crypto';

/** Redis key prefix from env or default. */
export function redisPrefix(): string {
  return process.env.REDIS_PREFIX ?? 'stipulate:';
}

export function prefixedKey(...parts: string[]): string {
  return `${redisPrefix()}${parts.join(':')}`;
}

export function hashKey(input: string, length = 16): string {
  return createHash('sha256').update(input).digest('hex').slice(0, length);
}
