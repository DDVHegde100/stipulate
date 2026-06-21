import * as issuingRepo from '../repositories/issuing.repository.js';

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

  return false;
}
