import { query } from '../lib/db.js';
import { findVirtualCardIdByExternalId, listVirtualCards } from './issuing.repository.js';

export interface IssuingAuthorizationRow {
  id: string;
  virtual_card_id: string | null;
  card_external_id: string;
  external_id: string;
  amount_minor: number;
  currency: string;
  merchant_name: string | null;
  merchant_category_code: string | null;
  status: string;
  authorized_at: Date;
  created_at: Date;
}

const testAuthorizations = new Map<string, IssuingAuthorizationRow>();

export async function upsertIssuingAuthorization(input: {
  externalId: string;
  cardExternalId: string;
  amountMinor: number;
  currency?: string;
  merchantName?: string;
  merchantCategoryCode?: string;
  status: string;
  authorizedAt?: Date;
}): Promise<IssuingAuthorizationRow> {
  const virtualCardId = await findVirtualCardIdByExternalId(input.cardExternalId);

  if (process.env.NODE_ENV === 'test') {
    const existing = testAuthorizations.get(input.externalId);
    const row: IssuingAuthorizationRow = {
      id: existing?.id ?? `00000000-0000-4000-8000-${String(testAuthorizations.size + 1).padStart(12, '0')}`,
      virtual_card_id: virtualCardId,
      card_external_id: input.cardExternalId,
      external_id: input.externalId,
      amount_minor: input.amountMinor,
      currency: (input.currency ?? 'USD').toUpperCase(),
      merchant_name: input.merchantName ?? null,
      merchant_category_code: input.merchantCategoryCode ?? null,
      status: input.status,
      authorized_at: input.authorizedAt ?? existing?.authorized_at ?? new Date(),
      created_at: existing?.created_at ?? new Date(),
    };
    testAuthorizations.set(input.externalId, row);
    return row;
  }

  const result = await query<IssuingAuthorizationRow>(
    `INSERT INTO issuing_authorizations (
       virtual_card_id, card_external_id, external_id, amount_minor, currency,
       merchant_name, merchant_category_code, status, authorized_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, NOW()))
     ON CONFLICT (external_id) DO UPDATE SET
       amount_minor = EXCLUDED.amount_minor,
       merchant_name = COALESCE(EXCLUDED.merchant_name, issuing_authorizations.merchant_name),
       merchant_category_code = COALESCE(EXCLUDED.merchant_category_code, issuing_authorizations.merchant_category_code),
       status = EXCLUDED.status,
       virtual_card_id = COALESCE(EXCLUDED.virtual_card_id, issuing_authorizations.virtual_card_id),
       updated_at = NOW()
     RETURNING id, virtual_card_id, card_external_id, external_id, amount_minor, currency,
               merchant_name, merchant_category_code, status, authorized_at, created_at`,
    [
      virtualCardId,
      input.cardExternalId,
      input.externalId,
      input.amountMinor,
      (input.currency ?? 'USD').toUpperCase(),
      input.merchantName ?? null,
      input.merchantCategoryCode ?? null,
      input.status,
      input.authorizedAt ?? null,
    ],
  );
  return result.rows[0]!;
}

export async function listIssuingAuthorizations(input: {
  cardholderId?: string;
  virtualCardId?: string;
  limit?: number;
}): Promise<IssuingAuthorizationRow[]> {
  const limit = Math.min(input.limit ?? 50, 100);

  if (process.env.NODE_ENV === 'test') {
    let rows = [...testAuthorizations.values()];
    if (input.virtualCardId) {
      rows = rows.filter((row) => row.virtual_card_id === input.virtualCardId);
    }
    if (input.cardholderId) {
      const cards = await listVirtualCards(input.cardholderId);
      const cardIds = new Set(cards.map((card) => card.id));
      rows = rows.filter((row) => row.virtual_card_id != null && cardIds.has(row.virtual_card_id));
    }
    return rows.slice(0, limit);
  }

  if (input.virtualCardId) {
    const result = await query<IssuingAuthorizationRow>(
      `SELECT id, virtual_card_id, card_external_id, external_id, amount_minor, currency,
              merchant_name, merchant_category_code, status, authorized_at, created_at
       FROM issuing_authorizations
       WHERE virtual_card_id = $1::uuid
       ORDER BY authorized_at DESC
       LIMIT $2`,
      [input.virtualCardId, limit],
    );
    return result.rows;
  }

  if (input.cardholderId) {
    const result = await query<IssuingAuthorizationRow>(
      `SELECT a.id, a.virtual_card_id, a.card_external_id, a.external_id, a.amount_minor, a.currency,
              a.merchant_name, a.merchant_category_code, a.status, a.authorized_at, a.created_at
       FROM issuing_authorizations a
       JOIN virtual_cards v ON v.id = a.virtual_card_id
       WHERE v.cardholder_id = $1::uuid
       ORDER BY a.authorized_at DESC
       LIMIT $2`,
      [input.cardholderId, limit],
    );
    return result.rows;
  }

  return [];
}
