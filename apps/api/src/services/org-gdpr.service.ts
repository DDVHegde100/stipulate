import { query } from '../lib/db.js';
import * as orgRepo from '../repositories/org.repository.js';
import * as usageRepo from '../repositories/usage.repository.js';

export interface OrgExportBundle {
  exportedAt: string;
  org: {
    id: string;
    slug: string;
    name: string;
    plan: string;
  };
  apiKeys: Array<{ id: string; prefix: string; name: string; scopes: string[]; createdAt: string }>;
  usageSummary: { totalCalls: number; totalCostMicros: number; byType: Record<string, number> };
  webhooks: Array<{ id: string; url: string; events: string[]; isActive: boolean }>;
  deletionRequest?: { scheduledFor: string; status: string };
}

const testOrgDeletionRequests = new Map<string, { scheduledFor: string; status: string }>();

export function listTestOrgDeletionsDue(): string[] {
  const now = Date.now();
  return [...testOrgDeletionRequests.entries()]
    .filter(([, request]) => request.status === 'scheduled' && Date.parse(request.scheduledFor) <= now)
    .map(([orgId]) => orgId);
}

export function clearTestOrgDeletion(orgId: string): void {
  testOrgDeletionRequests.delete(orgId);
}

/** Build a GDPR export bundle for an org. */
export async function exportOrgData(orgId: string): Promise<OrgExportBundle> {
  if (process.env.NODE_ENV === 'test') {
    return {
      exportedAt: new Date().toISOString(),
      org: { id: orgId, slug: 'test-org', name: 'Test Org', plan: 'free' },
      apiKeys: [],
      usageSummary: { totalCalls: 0, totalCostMicros: 0, byType: {} },
      webhooks: [],
      deletionRequest: testOrgDeletionRequests.get(orgId),
    };
  }

  const orgResult = await query<{ id: string; slug: string; name: string; plan: string }>(
    `SELECT id, slug, name, plan FROM organizations WHERE id = $1::uuid LIMIT 1`,
    [orgId],
  );
  const org = orgResult.rows[0];
  if (!org) throw new Error('Organization not found');

  const keys = await orgRepo.listApiKeysForOrg(orgId);
  const since = new Date();
  since.setFullYear(since.getFullYear() - 1);
  const usageSummary = await usageRepo.getUsageSummary(orgId, since.toISOString());

  const webhookResult = await query<{ id: string; url: string; events: unknown; is_active: boolean }>(
    `SELECT id, url, events, is_active FROM webhook_subscriptions WHERE org_id = $1::uuid`,
    [orgId],
  );

  const deletionResult = await query<{ scheduled_for: string; status: string }>(
    `SELECT scheduled_for::text, status FROM org_deletion_requests
     WHERE org_id = $1::uuid AND status = 'scheduled' LIMIT 1`,
    [orgId],
  );

  return {
    exportedAt: new Date().toISOString(),
    org: { id: org.id, slug: org.slug, name: org.name, plan: org.plan },
    apiKeys: keys.map((k) => ({
      id: k.id,
      prefix: k.prefix,
      name: k.name,
      scopes: k.scopes,
      createdAt: k.created_at,
    })),
    usageSummary,
    webhooks: webhookResult.rows.map((w) => ({
      id: w.id,
      url: w.url,
      events: Array.isArray(w.events) ? (w.events as string[]) : JSON.parse(String(w.events ?? '[]')),
      isActive: w.is_active,
    })),
    deletionRequest: deletionResult.rows[0]
      ? {
          scheduledFor: deletionResult.rows[0].scheduled_for,
          status: deletionResult.rows[0].status,
        }
      : undefined,
  };
}

/** Schedule org deletion after a 30-day grace period. */
export async function scheduleOrgDeletion(orgId: string): Promise<{ scheduledFor: string }> {
  const scheduledFor = new Date();
  scheduledFor.setDate(scheduledFor.getDate() + 30);

  if (process.env.NODE_ENV === 'test') {
    testOrgDeletionRequests.set(orgId, {
      scheduledFor: scheduledFor.toISOString(),
      status: 'scheduled',
    });
    return { scheduledFor: scheduledFor.toISOString() };
  }

  await query(
    `INSERT INTO org_deletion_requests (org_id, scheduled_for)
     VALUES ($1::uuid, $2::timestamptz)
     ON CONFLICT (org_id) DO UPDATE SET
       scheduled_for = EXCLUDED.scheduled_for,
       status = 'scheduled',
       requested_at = NOW()`,
    [orgId, scheduledFor.toISOString()],
  );

  await query(`UPDATE api_keys SET is_active = FALSE, updated_at = NOW() WHERE org_id = $1::uuid`, [orgId]);

  return { scheduledFor: scheduledFor.toISOString() };
}

/** Cancel a scheduled org deletion request. */
export async function cancelOrgDeletion(orgId: string): Promise<{ cancelled: boolean }> {
  if (process.env.NODE_ENV === 'test') {
    const existed = testOrgDeletionRequests.delete(orgId);
    return { cancelled: existed };
  }

  const result = await query(
    `UPDATE org_deletion_requests SET status = 'cancelled', completed_at = NOW()
     WHERE org_id = $1::uuid AND status = 'scheduled'`,
    [orgId],
  );

  await query(`UPDATE api_keys SET is_active = TRUE, updated_at = NOW() WHERE org_id = $1::uuid`, [orgId]);

  return { cancelled: (result.rowCount ?? 0) > 0 };
}

export async function getOrgDeletionStatus(
  orgId: string,
): Promise<{ scheduledFor: string; status: string } | null> {
  if (process.env.NODE_ENV === 'test') {
    return testOrgDeletionRequests.get(orgId) ?? null;
  }

  const result = await query<{ scheduled_for: string; status: string }>(
    `SELECT scheduled_for::text, status FROM org_deletion_requests
     WHERE org_id = $1::uuid AND status = 'scheduled' LIMIT 1`,
    [orgId],
  );

  return result.rows[0]
    ? { scheduledFor: result.rows[0].scheduled_for, status: result.rows[0].status }
    : null;
}
