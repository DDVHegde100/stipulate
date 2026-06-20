import { query } from '../lib/db.js';

export interface WalletCardRow {
  id: string;
  consumer_user_id: string;
  card_id: string;
  label: string | null;
  is_primary: boolean;
  added_at: Date;
  removed_at: Date | null;
}

/** List active wallet cards for a consumer user. */
export async function listWalletCards(consumerUserId: string): Promise<WalletCardRow[]> {
  const result = await query<WalletCardRow>(
    `SELECT id, consumer_user_id, card_id, label, is_primary, added_at, removed_at
     FROM user_wallet_cards
     WHERE consumer_user_id = $1 AND removed_at IS NULL
     ORDER BY is_primary DESC, added_at ASC`,
    [consumerUserId],
  );
  return result.rows;
}

/** Add a card to a consumer wallet. */
export async function addWalletCard(input: {
  consumerUserId: string;
  cardId: string;
  label?: string;
  isPrimary?: boolean;
}): Promise<WalletCardRow> {
  const result = await query<WalletCardRow>(
    `INSERT INTO user_wallet_cards (consumer_user_id, card_id, label, is_primary)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (consumer_user_id, card_id) DO UPDATE SET
       label = COALESCE(EXCLUDED.label, user_wallet_cards.label),
       is_primary = EXCLUDED.is_primary,
       removed_at = NULL,
       added_at = NOW()
     RETURNING id, consumer_user_id, card_id, label, is_primary, added_at, removed_at`,
    [input.consumerUserId, input.cardId, input.label ?? null, input.isPrimary ?? false],
  );
  return result.rows[0]!;
}
