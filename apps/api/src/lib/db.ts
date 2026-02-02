import pg, { type Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

import { loadEnv } from '../config/env.js';
import { createChildLogger } from './logger.js';

const log = createChildLogger({ component: 'postgres' });

let pool: Pool | undefined;

export interface DatabaseHealth {
  ok: boolean;
  latencyMs: number;
  error?: string;
}

function createPool(): Pool {
  const env = loadEnv();

  const instance = new pg.Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    allowExitOnIdle: env.NODE_ENV === 'test',
  });

  instance.on('connect', () => {
    log.debug('New PostgreSQL client connected to pool');
  });

  instance.on('error', (error) => {
    log.error({ err: error }, 'Unexpected PostgreSQL pool error');
  });

  return instance;
}

export function getPool(): Pool {
  if (!pool) {
    pool = createPool();
  }

  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  const start = performance.now();
  const result = await getPool().query<T>(text, params);
  const durationMs = performance.now() - start;

  log.debug(
    {
      durationMs: Number(durationMs.toFixed(2)),
      rowCount: result.rowCount,
      command: result.command,
    },
    'Executed SQL query',
  );

  return result;
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const start = performance.now();

  try {
    await query('SELECT 1 AS ok');
    return {
      ok: true,
      latencyMs: Number((performance.now() - start).toFixed(2)),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';

    return {
      ok: false,
      latencyMs: Number((performance.now() - start).toFixed(2)),
      error: message,
    };
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (!pool) {
    return;
  }

  const instance = pool;
  pool = undefined;

  await instance.end();
  log.info('PostgreSQL pool closed');
}

/** Reset singleton — intended for tests only. */
export function resetDatabasePool(): void {
  pool = undefined;
}
