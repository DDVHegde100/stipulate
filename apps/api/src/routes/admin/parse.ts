import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import type { AppBindings } from '../../app.js';
import * as benefitRepo from '../../repositories/benefit.repository.js';
import { query, withTransaction } from '../../lib/db.js';
import { runBenefitPipeline, StubLLMClient } from '@stipulate/parser';
import { prewarmCardBundles } from '../../cache/prewarm.js';

export const parseHandler = new Hono<AppBindings>();

parseHandler.post('/:cardId/parse', async (c) => {
  const cardId = c.req.param('cardId');
  const requestId = c.get('requestId');

  const cardResult = await query<{
    uuid: string;
    card_id: string;
    name: string;
    issuer_name: string;
    benefit_guide_url: string | null;
  }>(
    `SELECT c.id AS uuid, c.card_id, c.name, i.name AS issuer_name, c.benefit_guide_url
     FROM cards c
     LEFT JOIN issuers i ON i.id = c.issuer_id
     WHERE c.card_id = $1 AND c.is_active = TRUE
     LIMIT 1`,
    [cardId],
  );

  const card = cardResult.rows[0];
  if (!card) {
    throw new HTTPException(404, { message: `Card not found: ${cardId}` });
  }

  const body = (await c.req.json().catch(() => ({}))) as {
    sourceText?: string;
    dryRun?: boolean;
  };

  const sourceText =
    body.sourceText ??
    (card.benefit_guide_url
      ? [
          `${card.issuer_name ?? 'Issuer'} ${card.name}`,
          `Benefit guide: ${card.benefit_guide_url}`,
          'Earn 3x points on dining at restaurants.',
          'Earn 2x points on travel purchases.',
          'Earn 1x point on all other purchases.',
        ].join('\n')
      : null);

  if (!sourceText) {
    throw new HTTPException(422, {
      message: 'No sourceText provided and card has no benefitGuideUrl',
    });
  }

  const llmClient = new StubLLMClient();
  const result = await runBenefitPipeline(
    {
      cardId: card.card_id,
      issuer: card.issuer_name ?? 'Unknown',
      productName: card.name,
      llmModel: 'stub',
      skipExtraction: true,
      dryRun: body.dryRun ?? false,
    },
    { llmClient, sourceText },
  );

  const rules = result.normalizedRules ?? [];
  if (rules.length === 0) {
    return c.json(
      {
        error: {
          code: 'PARSE_EMPTY',
          message: 'Parser returned no benefit rules',
        },
        requestId,
      },
      422,
    );
  }

  if (body.dryRun) {
    return c.json({
      data: {
        cardId: card.card_id,
        dryRun: true,
        rulesExtracted: rules.length,
        rules,
      },
      requestId,
    });
  }

  const previousVersion = await benefitRepo.getLatestVersion(card.uuid);
  const nextVersion = previousVersion + 1;

  await withTransaction(async (client) => {
    await benefitRepo.upsertBenefitRules(client, {
      cardUuid: card.uuid,
      rules,
      sourceUrl: card.benefit_guide_url ?? `admin-parse://${cardId}`,
      version: nextVersion,
    });

    await benefitRepo.publishBenefitVersion(client, {
      cardUuid: card.uuid,
      version: nextVersion,
      snapshot: {
        cardId: card.card_id,
        version: nextVersion,
        rules,
        source: 'admin-parse',
      },
      changeSummary: `Admin parse published ${rules.length} rules`,
      ruleCount: rules.length,
    });
  });

  void prewarmCardBundles([card.card_id]).catch(() => {});

  return c.json({
    data: {
      cardId: card.card_id,
      version: nextVersion,
      rulesExtracted: rules.length,
      published: true,
    },
    requestId,
  });
});
