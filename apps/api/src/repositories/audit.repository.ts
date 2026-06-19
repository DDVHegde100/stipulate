import { randomUUID } from 'node:crypto';

import { query } from '../lib/db.js';

export interface AuditEventRow {
  id: string;
  org_id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

const testEvents: AuditEventRow[] = [];

export async function recordAuditEvent(input: {
  orgId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    testEvents.unshift({
      id: randomUUID(),
      org_id: input.orgId,
      action: input.action,
      resource_type: input.resourceType ?? null,
      resource_id: input.resourceId ?? null,
      metadata: input.metadata ?? {},
      created_at: new Date().toISOString(),
    });
    return;
  }

  await query(
    `INSERT INTO org_audit_events (org_id, action, resource_type, resource_id, metadata)
     VALUES ($1::uuid, $2, $3, $4, $5)`,
    [
      input.orgId,
      input.action,
      input.resourceType ?? null,
      input.resourceId ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
}

export async function listAuditEvents(orgId: string, limit = 50): Promise<AuditEventRow[]> {
  if (process.env.NODE_ENV === 'test') {
    return testEvents.filter((e) => e.org_id === orgId).slice(0, limit);
  }

  const result = await query<AuditEventRow>(
    `SELECT id, org_id, action, resource_type, resource_id, metadata, created_at::text
     FROM org_audit_events
     WHERE org_id = $1::uuid
     ORDER BY created_at DESC
     LIMIT $2`,
    [orgId, limit],
  );

  return result.rows.map((row) => ({
    ...row,
    metadata:
      typeof row.metadata === 'object' && row.metadata !== null
        ? (row.metadata as Record<string, unknown>)
        : {},
  }));
}

/** Reset in-memory audit events — tests only. */
export function resetTestAuditEvents(): void {
  testEvents.length = 0;
}
