import { query } from '../lib/db.js';

export async function insertChangelogEvent(input: {
  cardUuid: string;
  version: number;
  previousVersion?: number;
  eventType: string;
  severity: string;
  changeSummary: string;
  changes: unknown[];
  effectiveFrom?: string;
}): Promise<string> {
  if (process.env.NODE_ENV === 'test') {
    return `changelog-test-${input.cardUuid}-${input.version}`;
  }

  const result = await query<{ id: string }>(
    `INSERT INTO benefit_changelog_events
       (card_id, version, previous_version, event_type, severity, change_summary, changes, effective_from)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date)
     ON CONFLICT (card_id, version, event_type) DO UPDATE SET change_summary = EXCLUDED.change_summary
     RETURNING id`,
    [
      input.cardUuid,
      input.version,
      input.previousVersion ?? null,
      input.eventType,
      input.severity,
      input.changeSummary,
      JSON.stringify(input.changes),
      input.effectiveFrom ?? null,
    ],
  );
  return result.rows[0]!.id;
}
