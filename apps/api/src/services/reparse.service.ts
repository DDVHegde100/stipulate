import {
  ReparseScheduler,
  summarizeReparseBatch,
  hashContent,
  type ReparseTarget,
} from '@stipulate/parser';
import * as reparseRepo from '../repositories/reparse.repository.js';
import { ingestionService } from './ingestion.service.js';
import { notifyConsumersOfBenefitChange } from './benefit-alert.service.js';

const ISSUER_MAP: Record<string, string> = {
  chase_sapphire_preferred: 'Chase',
  amex_gold: 'American Express',
  capital_one_venture: 'Capital One',
};

/** Run scheduled reparse across DB catalog targets, enqueue ingestion on change. */
export async function runScheduledReparse(options: {
  limit?: number;
  concurrency?: number;
} = {}): Promise<{
  runId: string;
  summary: ReturnType<typeof summarizeReparseBatch>;
  enqueued: number;
}> {
  const runId = await reparseRepo.startReparseRun();
  const rows = await reparseRepo.listReparseTargets(options.limit ?? 50);

  const targets: ReparseTarget[] = rows
    .filter((r) => r.benefit_guide_url)
    .map((r) => ({
      cardId: r.card_id,
      issuer: ISSUER_MAP[r.card_id] ?? 'Unknown',
      productName: r.name,
      sourceUrl: r.benefit_guide_url!,
      lastContentHash: r.last_content_hash ?? undefined,
    }));

  const scheduler = new ReparseScheduler();
  scheduler.enqueueAll(targets);

  const results = await scheduler.runConcurrent(options.concurrency ?? 3);

  let enqueued = 0;
  for (const result of results) {
    if (result.changed && !result.error) {
      const hash = result.contentHash || hashContent(result.sourceUrl);
      await reparseRepo.updateCardContentHash(result.cardId, hash);

      const target = targets.find((t) => t.cardId === result.cardId);
      if (target) {
        void notifyConsumersOfBenefitChange({
          cardId: target.cardId,
          cardName: target.productName,
          changeSummary: 'Issuer benefit guide changed — rules are being re-ingested',
          severity: 'material',
        });

        await ingestionService.createIngestionJob({
          cardId: target.cardId,
          sourceUrl: target.sourceUrl,
          priority: 5,
        });
        enqueued++;
      }
    }
  }

  const summary = summarizeReparseBatch(results);
  await reparseRepo.completeReparseRun(runId, {
    checked: summary.total,
    changed: summary.changed,
    failed: summary.failed,
  });

  return { runId, summary, enqueued };
}
