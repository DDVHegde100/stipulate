import { query } from '../lib/db.js';

export interface PlaidItemRow {
  id: string;
  consumer_user_id: string | null;
  org_id: string | null;
  item_id: string;
  institution_id: string | null;
  institution_name: string | null;
  access_token_encrypted: string;
  status: string;
}

export interface LinkedAccountRow {
  id: string;
  plaid_item_id: string;
  account_id: string;
  account_name: string | null;
  account_mask: string | null;
  account_type: string | null;
  account_subtype: string | null;
  mapped_card_id: string | null;
  mapping_confidence: number | null;
  mapping_source: string;
  is_active: boolean;
}

const testItems = new Map<string, PlaidItemRow>();
const testAccounts = new Map<string, LinkedAccountRow[]>();

function stubEncryptToken(token: string): string {
  return `stub:${Buffer.from(token).toString('base64url')}`;
}

/** Persist a Plaid item and optional linked accounts after token exchange. */
export async function upsertPlaidItem(input: {
  consumerUserId: string;
  itemId: string;
  institutionId?: string;
  institutionName?: string;
  accessToken: string;
  accounts?: Array<{
    accountId: string;
    accountName?: string;
    accountMask?: string;
    accountType?: string;
    accountSubtype?: string;
    mappedCardId?: string;
    mappingConfidence?: number;
  }>;
}): Promise<{ item: PlaidItemRow; accounts: LinkedAccountRow[] }> {
  if (process.env.NODE_ENV === 'test') {
    const item: PlaidItemRow = {
      id: `test-item-${input.itemId}`,
      consumer_user_id: input.consumerUserId,
      org_id: null,
      item_id: input.itemId,
      institution_id: input.institutionId ?? null,
      institution_name: input.institutionName ?? null,
      access_token_encrypted: stubEncryptToken(input.accessToken),
      status: 'active',
    };
    testItems.set(input.consumerUserId, item);

    const accounts: LinkedAccountRow[] = (input.accounts ?? []).map((account, index) => ({
      id: `test-account-${index}`,
      plaid_item_id: item.id,
      account_id: account.accountId,
      account_name: account.accountName ?? null,
      account_mask: account.accountMask ?? null,
      account_type: account.accountType ?? null,
      account_subtype: account.accountSubtype ?? null,
      mapped_card_id: account.mappedCardId ?? null,
      mapping_confidence: account.mappingConfidence ?? null,
      mapping_source: 'heuristic',
      is_active: true,
    }));
    testAccounts.set(input.consumerUserId, accounts);
    return { item, accounts };
  }

  const itemResult = await query<PlaidItemRow>(
    `INSERT INTO plaid_items (
       consumer_user_id, item_id, institution_id, institution_name, access_token_encrypted
     ) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (item_id) DO UPDATE SET
       institution_id = EXCLUDED.institution_id,
       institution_name = EXCLUDED.institution_name,
       access_token_encrypted = EXCLUDED.access_token_encrypted,
       status = 'active',
       updated_at = NOW()
     RETURNING id, consumer_user_id, org_id, item_id, institution_id, institution_name,
               access_token_encrypted, status`,
    [
      input.consumerUserId,
      input.itemId,
      input.institutionId ?? null,
      input.institutionName ?? null,
      stubEncryptToken(input.accessToken),
    ],
  );
  const item = itemResult.rows[0]!;

  const accounts: LinkedAccountRow[] = [];
  for (const account of input.accounts ?? []) {
    const accountResult = await query<LinkedAccountRow>(
      `INSERT INTO linked_accounts (
         plaid_item_id, account_id, account_name, account_mask, account_type, account_subtype,
         mapped_card_id, mapping_confidence, mapping_source
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'heuristic')
       ON CONFLICT (plaid_item_id, account_id) DO UPDATE SET
         account_name = EXCLUDED.account_name,
         account_mask = EXCLUDED.account_mask,
         mapped_card_id = EXCLUDED.mapped_card_id,
         mapping_confidence = EXCLUDED.mapping_confidence,
         is_active = TRUE,
         updated_at = NOW()
       RETURNING id, plaid_item_id, account_id, account_name, account_mask, account_type,
                 account_subtype, mapped_card_id, mapping_confidence, mapping_source, is_active`,
      [
        item.id,
        account.accountId,
        account.accountName ?? null,
        account.accountMask ?? null,
        account.accountType ?? null,
        account.accountSubtype ?? null,
        account.mappedCardId ?? null,
        account.mappingConfidence ?? null,
      ],
    );
    accounts.push(accountResult.rows[0]!);
  }

  return { item, accounts };
}

/** List linked accounts for a consumer user. */
export async function listLinkedAccounts(consumerUserId: string): Promise<
  Array<LinkedAccountRow & { institutionName: string | null }>
> {
  if (process.env.NODE_ENV === 'test') {
    const item = testItems.get(consumerUserId);
    const accounts = testAccounts.get(consumerUserId) ?? [];
    return accounts.map((account) => ({
      ...account,
      institutionName: item?.institution_name ?? null,
    }));
  }

  const result = await query<LinkedAccountRow & { institution_name: string | null }>(
    `SELECT la.id, la.plaid_item_id, la.account_id, la.account_name, la.account_mask,
            la.account_type, la.account_subtype, la.mapped_card_id, la.mapping_confidence,
            la.mapping_source, la.is_active, pi.institution_name
     FROM linked_accounts la
     JOIN plaid_items pi ON pi.id = la.plaid_item_id
     WHERE pi.consumer_user_id = $1
       AND pi.status = 'active'
       AND la.is_active = TRUE
     ORDER BY la.account_name ASC NULLS LAST`,
    [consumerUserId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    plaid_item_id: row.plaid_item_id,
    account_id: row.account_id,
    account_name: row.account_name,
    account_mask: row.account_mask,
    account_type: row.account_type,
    account_subtype: row.account_subtype,
    mapped_card_id: row.mapped_card_id,
    mapping_confidence: row.mapping_confidence,
    mapping_source: row.mapping_source,
    is_active: row.is_active,
    institutionName: row.institution_name,
  }));
}
