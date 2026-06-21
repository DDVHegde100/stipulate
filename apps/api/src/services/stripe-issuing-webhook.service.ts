import * as issuingRepo from '../repositories/issuing.repository.js';
import * as authRepo from '../repositories/issuing-authorization.repository.js';

function mapStripeCardStatus(status: string): 'active' | 'frozen' | 'closed' {
  if (status === 'inactive') return 'frozen';
  if (status === 'canceled') return 'closed';
  return 'active';
}

function mapStripeCardholderStatus(status: string): string {
  if (status === 'blocked') return 'suspended';
  if (status === 'inactive') return 'pending';
  return 'approved';
}

function mapStripeKycStatus(requirements: unknown): string {
  if (!requirements || typeof requirements !== 'object') return 'passed';
  const disabled = (requirements as { disabled_reason?: string }).disabled_reason;
  if (disabled) return 'review';
  return 'passed';
}

function mapStripeAuthorizationStatus(status: string): string {
  if (status === 'closed') return 'approved';
  if (status === 'reversed') return 'reversed';
  if (status === 'declined') return 'declined';
  return 'pending';
}

function readMerchantData(object: Record<string, unknown>): {
  name?: string;
  mcc?: string;
} {
  const merchant = object.merchant_data;
  if (!merchant || typeof merchant !== 'object') return {};
  const data = merchant as Record<string, unknown>;
  return {
    name: data.name ? String(data.name) : undefined,
    mcc: data.category_code ? String(data.category_code).slice(0, 4) : undefined,
  };
}

/** Sync Stripe Issuing webhook payloads into local issuing tables. */
export async function handleStripeIssuingWebhookEvent(event: {
  type: string;
  data: { object: Record<string, unknown> };
}): Promise<boolean> {
  if (event.type === 'issuing_card.updated') {
    const card = event.data.object;
    const externalId = String(card.id ?? '');
    if (!externalId.startsWith('ic_')) return false;

    await issuingRepo.syncVirtualCardFromExternal({
      externalId,
      status: mapStripeCardStatus(String(card.status ?? 'active')),
      last4: card.last4 ? String(card.last4) : undefined,
      network: card.brand ? String(card.brand) : undefined,
    });
    return true;
  }

  if (event.type === 'issuing_cardholder.updated') {
    const holder = event.data.object;
    const externalId = String(holder.id ?? '');
    if (!externalId.startsWith('ich_')) return false;

    await issuingRepo.syncCardholderFromExternal({
      externalId,
      status: mapStripeCardholderStatus(String(holder.status ?? 'active')),
      kycStatus: mapStripeKycStatus(holder.requirements),
    });
    return true;
  }

  if (event.type === 'issuing_authorization.created' || event.type === 'issuing_authorization.updated') {
    const auth = event.data.object;
    const externalId = String(auth.id ?? '');
    const cardExternalId = String(auth.card ?? '');
    if (!externalId.startsWith('iauth_') || !cardExternalId.startsWith('ic_')) return false;

    const merchant = readMerchantData(auth);
    const amount = typeof auth.amount === 'number' ? auth.amount : Number(auth.amount ?? 0);
    const authorizedAt =
      typeof auth.created === 'number' ? new Date(auth.created * 1000) : undefined;

    await authRepo.upsertIssuingAuthorization({
      externalId,
      cardExternalId,
      amountMinor: amount,
      currency: auth.currency ? String(auth.currency) : 'USD',
      merchantName: merchant.name,
      merchantCategoryCode: merchant.mcc,
      status: mapStripeAuthorizationStatus(String(auth.status ?? 'pending')),
      authorizedAt,
    });
    return true;
  }

  return false;
}
