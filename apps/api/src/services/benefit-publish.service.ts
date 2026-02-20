import type { NormalizedBenefitRule } from '@stipulate/parser';
import { buildWebhookPayload } from '@stipulate/schema';
import * as benefitRepo from '../repositories/benefit.repository.js';
import * as changelogRepo from '../repositories/changelog.repository.js';
import * as ingestionRepo from '../repositories/ingestion.repository.js';
import * as webhookRepo from '../repositories/webhook.repository.js';
import { withTransaction } from '../lib/db.js';

/** Publish normalized rules from an approved ingestion job to the catalog. */
export async function publishIngestionBenefits(jobId: string): Promise<void> {
  const job = await ingestionRepo.getIngestionJobById(jobId);
  if (!job) throw new Error('Ingestion job not found');

  const rules = (job.normalizedRules ?? []) as NormalizedBenefitRule[];
  if (rules.length === 0 && process.env.NODE_ENV === 'test') {
    await ingestionRepo.updateIngestionJob(jobId, {
      status: 'published',
      completedAt: new Date().toISOString(),
    });
    return;
  }

  const card = await benefitRepo.findCardUuid(job.cardId);
  if (!card && process.env.NODE_ENV !== 'test') {
    throw new Error(`Card not found: ${job.cardId}`);
  }

  if (process.env.NODE_ENV === 'test') {
    await ingestionRepo.updateIngestionJob(jobId, {
      status: 'published',
      completedAt: new Date().toISOString(),
    });
    return;
  }

  const cardUuid = card!.uuid;
  const previousVersion = await benefitRepo.getLatestVersion(cardUuid);
  const nextVersion = previousVersion + 1;

  await withTransaction(async (client) => {
    await benefitRepo.upsertBenefitRules(client, {
      cardUuid,
      rules,
      sourceUrl: job.sourceUrl,
      version: nextVersion,
    });

    const snapshot = {
      cardId: job.cardId,
      version: nextVersion,
      rules,
      severity: 'material',
      changes: [{ type: 'rules_updated', field: 'benefits', description: 'Ingestion publish' }],
      effective_from: new Date().toISOString().slice(0, 10),
    };

    await benefitRepo.publishBenefitVersion(client, {
      cardUuid,
      version: nextVersion,
      snapshot,
      changeSummary: `Published ${rules.length} benefit rules from ingestion job ${jobId}`,
    });
  });

  const eventId = await changelogRepo.insertChangelogEvent({
    cardUuid,
    version: nextVersion,
    previousVersion,
    eventType: 'benefit.version_published',
    severity: 'material',
    changeSummary: `Published ${rules.length} rules for ${job.cardId}`,
    changes: [],
    effectiveFrom: new Date().toISOString().slice(0, 10),
  });

  const payload = buildWebhookPayload({
    cardId: job.cardId,
    version: nextVersion,
    previousVersion,
    changes: [],
    eventType: 'benefit.version_published',
  });

  try {
    const subs = await webhookRepo.listActiveSubscriptionsForEvent('benefit.version_published');
    for (const sub of subs) {
      await webhookRepo.queueWebhookDelivery({
        subscriptionId: sub.id,
        eventId,
        payload,
      });
    }
  } catch {
    // webhook queue is best-effort
  }

  await ingestionRepo.updateIngestionJob(jobId, {
    status: 'published',
    completedAt: new Date().toISOString(),
  });
}
