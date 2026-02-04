import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listMigrationFiles, getMigrationStatus } from '../migrate.js';

describe('migration runner', () => {
  it('lists migration files in sorted order', async () => {
    const files = await listMigrationFiles();
    expect(files.length).toBeGreaterThan(0);
    expect(files[0]).toMatch(/^\d{3}_.+\.sql$/);
    expect(files).toEqual([...files].sort());
  });

  it('reports pending migrations on empty database mock', async () => {
    const mockPool = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('CREATE TABLE IF NOT EXISTS schema_migrations')) {
          return { rows: [] };
        }
        if (sql.includes('SELECT version')) {
          return { rows: [] };
        }
        return { rows: [] };
      }),
    };

    const status = await getMigrationStatus(mockPool as never);
    expect(status.pending.length).toBeGreaterThan(0);
    expect(status.applied).toHaveLength(0);
  });
});
