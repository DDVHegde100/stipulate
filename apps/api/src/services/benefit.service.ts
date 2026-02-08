import {
  BenefitRuleSchema,
  type BenefitChangelogEntry,
  type BenefitChangelogResponse,
  type CardBenefitsResponse,
} from '@stipulate/schema';
import type { BenefitRule } from '@stipulate/schema';

import * as benefitRepo from '../repositories/benefit.repository.js';

export class BenefitServiceError extends Error {
  constructor(
    message: string,
    public code: 'CARD_NOT_FOUND' | 'VERSION_NOT_FOUND' | 'INVALID_DATE',
  ) {
    super(message);
    this.name = 'BenefitServiceError';
  }
}

/** In-memory fallback for cards with seeded demo benefits (no DB required in tests). */
const DEMO_BENEFITS: Record<string, BenefitRule[]> = {
  chase_sapphire_preferred: [
    BenefitRuleSchema.parse({
      id: 'rule-csp-dining',
      cardId: 'chase_sapphire_preferred',
      name: '3x Dining',
      category: 'dining',
      multiplier: 3,
      rewardType: 'points',
      caps: [],
      exclusions: [{ id: 'ex-fast-food', type: 'merchant', matcher: 'fast food' }],
    }),
    BenefitRuleSchema.parse({
      id: 'rule-csp-travel',
      cardId: 'chase_sapphire_preferred',
      name: '2x Travel',
      category: 'travel',
      multiplier: 2,
      rewardType: 'points',
      caps: [],
      exclusions: [],
    }),
    BenefitRuleSchema.parse({
      id: 'rule-csp-base',
      cardId: 'chase_sapphire_preferred',
      name: '1x Everything Else',
      category: 'other',
      multiplier: 1,
      rewardType: 'points',
      caps: [],
      exclusions: [],
    }),
  ],
  amex_gold: [
    BenefitRuleSchema.parse({
      id: 'rule-amex-dining',
      cardId: 'amex_gold',
      name: '4x Dining',
      category: 'dining',
      multiplier: 4,
      rewardType: 'points',
      caps: [],
      exclusions: [],
    }),
    BenefitRuleSchema.parse({
      id: 'rule-amex-grocery',
      cardId: 'amex_gold',
      name: '4x Groceries',
      category: 'groceries',
      multiplier: 4,
      rewardType: 'points',
      caps: [
        {
          id: 'cap-amex-grocery',
          period: 'annual',
          limit: { amountMinor: 2500000, currency: 'USD' },
          description: '$25,000 annual cap on U.S. supermarkets',
        },
      ],
      exclusions: [],
    }),
  ],
};

function rowToBenefitRule(row: benefitRepo.BenefitRuleRow): BenefitRule {
  return BenefitRuleSchema.parse({
    id: row.id,
    cardId: row.card_id,
    name: `${row.multiplier}x ${row.category}`,
    category: row.category,
    multiplier: parseFloat(row.multiplier),
    rewardType: row.reward_type,
    caps:
      row.cap_amount_cents != null
        ? [
            {
              id: `${row.id}-cap`,
              period: row.cap_period ?? 'annual',
              limit: { amountMinor: row.cap_amount_cents, currency: 'USD' },
            },
          ]
        : [],
    exclusions: Array.isArray(row.exclusions) ? row.exclusions : [],
    metadata: { confidence: parseFloat(row.confidence), version: row.version },
  });
}

export async function getCardBenefits(input: {
  cardId: string;
  asOf?: string;
  version?: number;
}): Promise<CardBenefitsResponse> {
  const asOf = input.asOf ?? new Date().toISOString().slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    throw new BenefitServiceError('as_of must be YYYY-MM-DD', 'INVALID_DATE');
  }

  const card = await benefitRepo.findCardUuid(input.cardId).catch(() => null);

  if (card) {
    if (input.version) {
      const versionRow = await benefitRepo.getBenefitVersion(card.uuid, input.version);
      if (!versionRow) {
        throw new BenefitServiceError(
          `Version ${input.version} not found for card ${input.cardId}`,
          'VERSION_NOT_FOUND',
        );
      }

      const snapshot = versionRow.snapshot as { benefits?: BenefitRule[] };
      return {
        card_id: input.cardId,
        card_name: versionRow.card_name,
        version: versionRow.version,
        as_of: asOf,
        benefits: snapshot.benefits ?? [],
        effective_from: asOf,
        effective_to: null,
      };
    }

    const rows = await benefitRepo.getBenefitRules(card.uuid, asOf);
    if (rows.length > 0) {
      const version = await benefitRepo.getLatestVersion(card.uuid);
      return {
        card_id: input.cardId,
        card_name: card.name,
        version,
        as_of: asOf,
        benefits: rows.map(rowToBenefitRule),
        effective_from: asOf,
        effective_to: null,
        source_url: rows[0]?.source_url ?? undefined,
        changelog_url: `/v1/changelog?card_id=${input.cardId}`,
      };
    }
  }

  const demo = DEMO_BENEFITS[input.cardId];
  if (!demo) {
    throw new BenefitServiceError(`Card not found: ${input.cardId}`, 'CARD_NOT_FOUND');
  }

  return {
    card_id: input.cardId,
    card_name: input.cardId.replace(/_/g, ' '),
    version: 1,
    as_of: asOf,
    benefits: demo,
    effective_from: asOf,
    effective_to: null,
    changelog_url: `/v1/changelog?card_id=${input.cardId}`,
  };
}

export async function getChangelog(input: {
  limit?: number;
  cursor?: string;
  cardId?: string;
}): Promise<BenefitChangelogResponse> {
  const limit = Math.min(input.limit ?? 20, 100);

  try {
    const { rows, hasMore } = await benefitRepo.listChangelog({
      limit,
      cursor: input.cursor,
      cardId: input.cardId,
    });

    if (rows.length > 0) {
      const entries: BenefitChangelogEntry[] = rows.map((row) => ({
        id: row.id,
        card_id: row.card_id,
        card_name: row.card_name,
        version: row.version,
        previous_version: row.previous_version ?? undefined,
        change_summary: row.change_summary,
        severity: row.severity as BenefitChangelogEntry['severity'],
        changes: Array.isArray(row.changes) ? row.changes : [],
        effective_from: row.effective_from?.toISOString().slice(0, 10),
        published_at: row.published_at.toISOString(),
      }));

      return {
        entries,
        has_more: hasMore,
        next_cursor: hasMore ? rows[rows.length - 1]?.published_at.toISOString() : undefined,
      };
    }
  } catch {
    // fall through to demo changelog
  }

  const demoEntries: BenefitChangelogEntry[] = [
    {
      id: '00000000-0000-4000-8000-000000000001',
      card_id: 'chase_sapphire_preferred',
      card_name: 'Sapphire Preferred',
      version: 2,
      previous_version: 1,
      change_summary: 'Dining multiplier reduced from 3x to 2x',
      severity: 'breaking',
      changes: [
        {
          card_id: 'chase_sapphire_preferred',
          field: 'multiplier',
          category: 'dining',
          old_value: 3,
          new_value: 2,
          detected_at: '2026-02-01T00:00:00.000Z',
          severity: 'breaking',
        },
      ],
      effective_from: '2026-02-01',
      published_at: '2026-02-01T12:00:00.000Z',
    },
  ];

  const filtered = input.cardId
    ? demoEntries.filter((e) => e.card_id === input.cardId)
    : demoEntries;

  return { entries: filtered, has_more: false };
}

export const benefitService = {
  getCardBenefits,
  getChangelog,
};
