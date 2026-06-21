import { query } from '../lib/db.js';
import { createChildLogger } from '../lib/logger.js';
import {
  clearTestConsumerDeletion,
  listTestConsumerDeletionsDue,
} from './consumer-gdpr.service.js';
import { listTestOrgDeletionsDue, clearTestOrgDeletion } from './org-gdpr.service.js';

const log = createChildLogger({ component: 'gdpr-purge' });

export interface PurgeSummary {
  consumersPurged: number;
  orgsPurged: number;
  purgedAt: string;
}

/** Purge consumer accounts and orgs whose deletion grace period has elapsed. */
export async function purgeDueDeletions(): Promise<PurgeSummary> {
  if (process.env.NODE_ENV === 'test') {
    let consumersPurged = 0;
    let orgsPurged = 0;

    for (const consumerUserId of listTestConsumerDeletionsDue()) {
      clearTestConsumerDeletion(consumerUserId);
      consumersPurged += 1;
    }

    for (const orgId of listTestOrgDeletionsDue()) {
      clearTestOrgDeletion(orgId);
      orgsPurged += 1;
    }

    return { consumersPurged, orgsPurged, purgedAt: new Date().toISOString() };
  }

  const dueConsumers = await query<{ consumer_user_id: string }>(
    `SELECT consumer_user_id::text AS consumer_user_id FROM consumer_deletion_requests
     WHERE status = 'scheduled' AND scheduled_for <= NOW()`,
  );

  for (const row of dueConsumers.rows) {
    await query(`DELETE FROM consumer_users WHERE id = $1::uuid`, [row.consumer_user_id]);
    log.info({ consumerUserId: row.consumer_user_id }, 'Purged consumer account');
  }

  const dueOrgs = await query<{ org_id: string }>(
    `SELECT org_id::text AS org_id FROM org_deletion_requests
     WHERE status = 'scheduled' AND scheduled_for <= NOW()`,
  );

  for (const row of dueOrgs.rows) {
    await query(`DELETE FROM organizations WHERE id = $1::uuid`, [row.org_id]);
    log.info({ orgId: row.org_id }, 'Purged organization');
  }

  return {
    consumersPurged: dueConsumers.rows.length,
    orgsPurged: dueOrgs.rows.length,
    purgedAt: new Date().toISOString(),
  };
}
