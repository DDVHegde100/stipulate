import { describe, it, expect } from 'vitest';
import {
  BenefitWebhookPayloadSchema,
  buildWebhookPayload,
  BenefitChangelogEntrySchema,
} from '../changelog.js';

describe('changelog schemas', () => {
  it('builds a valid webhook payload', () => {
    const payload = buildWebhookPayload({
      cardId: 'chase_sapphire_preferred',
      version: 2,
      previousVersion: 1,
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
    });
    expect(BenefitWebhookPayloadSchema.safeParse(payload).success).toBe(true);
    expect(payload.type).toBe('benefit.updated');
  });

  it('parses changelog entry', () => {
    const entry = BenefitChangelogEntrySchema.parse({
      id: '00000000-0000-4000-8000-000000000001',
      card_id: 'amex_gold',
      version: 1,
      change_summary: 'Initial publish',
      published_at: '2026-02-01T00:00:00.000Z',
    });
    expect(entry.card_id).toBe('amex_gold');
  });
});
