import * as plaidRepo from '../repositories/plaid.repository.js';
import { importStatementSpend } from '../repositories/spend.repository.js';
import { fetchRecentPlaidTransactions, isPlaidConfigured } from './plaid.service.js';

/** Sync Plaid transactions into cap spend tracking for mapped wallet cards. */
export async function syncPlaidTransactionsForConsumer(input: {
  consumerUserId: string;
  orgId?: string;
  days?: number;
}): Promise<{
  imported: number;
  totalMinor: number;
  mode: 'stub' | 'live';
}> {
  const item = await plaidRepo.getActivePlaidItem(input.consumerUserId);
  if (!item) {
    return { imported: 0, totalMinor: 0, mode: 'stub' };
  }

  const accounts = await plaidRepo.listLinkedAccounts(input.consumerUserId);
  const accountToCard = new Map(
    accounts
      .filter((account) => account.mapped_card_id)
      .map((account) => [account.account_id, account.mapped_card_id!]),
  );

  if (process.env.NODE_ENV === 'test' || !isPlaidConfigured()) {
    const stubRows = Array.from(accountToCard.values()).flatMap((cardId) => [
      { cardId, category: 'groceries', amountMinor: 4200 },
      { cardId, category: 'dining', amountMinor: 2800 },
    ]);

    if (stubRows.length === 0) {
      return { imported: 0, totalMinor: 0, mode: 'stub' };
    }

    const result = await importStatementSpend({
      orgId: input.orgId,
      userRef: input.consumerUserId,
      rows: stubRows,
    });
    return { ...result, mode: 'stub' };
  }

  const accessToken = plaidRepo.decodePlaidAccessToken(item);
  const transactions = await fetchRecentPlaidTransactions(accessToken, input.days ?? 30);
  const rows = transactions
    .map((txn) => {
      const cardId = accountToCard.get(txn.accountId);
      if (!cardId) return null;
      return { cardId, category: txn.category, amountMinor: txn.amountMinor };
    })
    .filter((row): row is { cardId: string; category: string; amountMinor: number } => row !== null);

  if (rows.length === 0) {
    return { imported: 0, totalMinor: 0, mode: 'live' };
  }

  const result = await importStatementSpend({
    orgId: input.orgId,
    userRef: input.consumerUserId,
    rows,
  });
  return { ...result, mode: 'live' };
}
