import { Redis, type Redis as RedisClient } from 'ioredis';

import { loadEnv } from '../config/env.js';
import { createChildLogger } from './logger.js';

const log = createChildLogger({ component: 'redis' });

let redisClient: RedisClient | undefined;

export function getRedis(): RedisClient {
  if (!redisClient) {
    const env = loadEnv();

    const client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy(times: number) {
        const delay = Math.min(times * 200, 5_000);
        log.warn({ attempt: times, delayMs: delay }, 'Redis reconnect scheduled');
        return delay;
      },
    });

    client.on('connect', () => {
      log.info('Redis connection established');
    });

    client.on('error', (error: Error) => {
      log.error({ err: error }, 'Redis client error');
    });

    client.on('close', () => {
      log.warn('Redis connection closed');
    });

    redisClient = client;
  }

  return redisClient;
}

export async function connectRedis(): Promise<void> {
  const client = getRedis();

  if (client.status === 'ready' || client.status === 'connecting') {
    return;
  }

  await client.connect();
}

export async function disconnectRedis(): Promise<void> {
  if (!redisClient) {
    return;
  }

  const client = redisClient;
  redisClient = undefined;

  await client.quit();
  log.info('Redis client disconnected');
}

export async function pingRedis(): Promise<boolean> {
  try {
    const client = getRedis();

    if (client.status === 'wait') {
      await connectRedis();
    }

    const response = await client.ping();
    return response === 'PONG';
  } catch (error) {
    log.error({ err: error }, 'Redis ping failed');
    return false;
  }
}

export async function getCachedJson<T>(key: string): Promise<T | null> {
  const client = getRedis();
  const raw = await client.get(key);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    log.warn({ err: error, key }, 'Failed to parse cached JSON payload');
    return null;
  }
}

export async function setCachedJson(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  const client = getRedis();
  await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

/** Reset singleton — intended for tests only. */
export function resetRedisClient(): void {
  redisClient = undefined;
}
