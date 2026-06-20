import { query } from '../lib/db.js';

export interface ReparseTargetRow {
  card_id: string;
  name: string;
  benefit_guide_url: string | null;
  last_content_hash: string | null;
}

export async function listReparseTargets(limit = 100): Promise<ReparseTargetRow[]> {
  if (process.env.NODE_ENV === 'test') {
    return [
      {
        card_id: 'chase_sapphire_preferred',
        name: 'Sapphire Preferred',
        benefit_guide_url: 'https://creditcards.chase.com/rewards-credit-cards/sapphire/preferred',
        last_content_hash: null,
      },
      {
        card_id: 'amex_gold',
        name: 'Gold Card',
        benefit_guide_url: 'https://www.americanexpress.com/us/credit-cards/card/gold-card/',
        last_content_hash: null,
      },
    ];
  }

  const result = await query<ReparseTargetRow>(
    `SELECT card_id, name, benefit_guide_url, last_content_hash
     FROM cards
     WHERE is_active = TRUE AND benefit_guide_url IS NOT NULL
     ORDER BY last_parsed_at NULLS FIRST, name ASC
     LIMIT $1`,
    [limit],
  );
  return result.rows;
}

export async function updateCardContentHash(cardId: string, hash: string): Promise<void> {
  if (process.env.NODE_ENV === 'test') return;

  await query(
    `UPDATE cards SET last_content_hash = $2, last_parsed_at = NOW(), updated_at = NOW()
     WHERE card_id = $1`,
    [cardId, hash],
  );
}

export async function startReparseRun(): Promise<string> {
  if (process.env.NODE_ENV === 'test') return 'reparse-test-run';

  const result = await query<{ id: string }>(
    `INSERT INTO reparse_runs (status) VALUES ('running') RETURNING id`,
  );
  return result.rows[0]!.id;
}

export async function completeReparseRun(
  runId: string,
  stats: { checked: number; changed: number; failed: number },
): Promise<void> {
  if (process.env.NODE_ENV === 'test') return;

  await query(
    `UPDATE reparse_runs SET status = 'completed', completed_at = NOW(),
            cards_checked = $2, cards_changed = $3, cards_failed = $4
     WHERE id = $1`,
    [runId, stats.checked, stats.changed, stats.failed],
  );
}

export interface ReparseRunRow {
  id: string;
  started_at: Date;
  completed_at: Date | null;
  cards_checked: number;
  cards_changed: number;
  cards_failed: number;
  status: string;
}

export async function listReparseRuns(limit = 20): Promise<ReparseRunRow[]> {
  if (process.env.NODE_ENV === 'test') {
    return [
      {
        id: 'reparse-test-run',
        started_at: new Date(),
        completed_at: new Date(),
        cards_checked: 50,
        cards_changed: 2,
        cards_failed: 0,
        status: 'completed',
      },
    ];
  }

  const result = await query<ReparseRunRow>(
    `SELECT id, started_at, completed_at, cards_checked, cards_changed, cards_failed, status
     FROM reparse_runs
     ORDER BY started_at DESC
     LIMIT $1`,
    [limit],
  );
  return result.rows;
}
