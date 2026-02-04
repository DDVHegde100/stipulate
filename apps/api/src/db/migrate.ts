import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type pg from 'pg';
import { createChildLogger } from '../lib/logger.js';

const log = createChildLogger({ component: 'db:migrate' });

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '../../migrations');

export interface MigrationRecord {
  version: string;
  applied_at: Date;
}

/** List migration SQL files sorted by version prefix. */
export async function listMigrationFiles(): Promise<string[]> {
  const files = await readdir(MIGRATIONS_DIR);
  return files.filter((f) => f.endsWith('.sql')).sort();
}

/** Return versions already applied in the database. */
export async function getAppliedMigrations(pool: pg.Pool): Promise<Set<string>> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const result = await pool.query<MigrationRecord>(
    'SELECT version, applied_at FROM schema_migrations ORDER BY version',
  );
  return new Set(result.rows.map((r) => r.version));
}

/** Run all pending migrations inside a transaction. */
export async function runMigrations(pool: pg.Pool): Promise<string[]> {
  const files = await listMigrationFiles();
  const applied = await getAppliedMigrations(pool);
  const newlyApplied: string[] = [];

  for (const file of files) {
    const version = file.replace(/\.sql$/, '');
    if (applied.has(version)) {
      log.debug({ version }, 'Migration already applied, skipping');
      continue;
    }

    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf-8');
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      log.info({ version }, 'Applying migration');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING',
        [version],
      );
      await client.query('COMMIT');
      newlyApplied.push(version);
      log.info({ version }, 'Migration applied');
    } catch (err) {
      await client.query('ROLLBACK');
      log.error({ version, err }, 'Migration failed');
      throw err;
    } finally {
      client.release();
    }
  }

  return newlyApplied;
}

/** Check migration status without applying. */
export async function getMigrationStatus(pool: pg.Pool): Promise<{
  applied: string[];
  pending: string[];
}> {
  const files = await listMigrationFiles();
  const appliedSet = await getAppliedMigrations(pool);
  const versions = files.map((f) => f.replace(/\.sql$/, ''));

  return {
    applied: versions.filter((v) => appliedSet.has(v)),
    pending: versions.filter((v) => !appliedSet.has(v)),
  };
}
