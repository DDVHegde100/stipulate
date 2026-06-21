import { findConsumerById } from '../repositories/consumer-user.repository.js';
import { findConsumerSubscription } from '../repositories/consumer-billing.repository.js';
import { listLinkedAccounts } from '../repositories/plaid.repository.js';
import { listIssuingAuthorizationsForConsumer } from '../repositories/issuing-authorization.repository.js';

export interface ConsumerExportBundle {
  exportedAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    timezone: string;
    walletCardIds: string[];
    notificationPrefs: { email: boolean; push: boolean };
  };
  subscription: {
    plan: string;
    status: string;
  };
  linkedAccounts: Array<{
    accountName: string | null;
    accountMask: string | null;
    mappedCardId: string | null;
  }>;
  recentAuthorizations: Array<{
    externalId: string;
    amountMinor: number;
    currency: string;
    merchantName: string | null;
    status: string;
    authorizedAt: string;
  }>;
}

/** Build a GDPR export bundle for a consumer user. */
export async function exportConsumerData(consumerUserId: string): Promise<ConsumerExportBundle> {
  const user = await findConsumerById(consumerUserId);
  if (!user) throw new Error('User not found');

  const subscription = await findConsumerSubscription(consumerUserId);
  const linkedAccounts = await listLinkedAccounts(consumerUserId);
  const authorizations = await listIssuingAuthorizationsForConsumer(consumerUserId, 25);

  return {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      timezone: user.timezone,
      walletCardIds: user.wallet_card_ids,
      notificationPrefs: user.notification_prefs,
    },
    subscription: {
      plan: subscription?.subscription_plan ?? 'free',
      status: subscription?.subscription_status ?? 'inactive',
    },
    linkedAccounts: linkedAccounts.map((account) => ({
      accountName: account.account_name,
      accountMask: account.account_mask,
      mappedCardId: account.mapped_card_id,
    })),
    recentAuthorizations: authorizations.map((row) => ({
      externalId: row.external_id,
      amountMinor: row.amount_minor,
      currency: row.currency,
      merchantName: row.merchant_name,
      status: row.status,
      authorizedAt: row.authorized_at.toISOString(),
    })),
  };
}
