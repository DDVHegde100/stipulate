import { demoApiKey, apiV1Base } from './demo-api';

export interface Cardholder {
  id: string;
  consumerUserId: string;
  programSlug: string;
  status: string;
  kycStatus: string;
  createdAt: string;
}

export interface VirtualCard {
  id: string;
  cardholderId: string;
  last4: string;
  network: string;
  status: 'active' | 'frozen' | 'closed';
  panToken?: string;
  expMonth?: number;
  expYear?: number;
  spendLimitMinor?: number;
}

export interface PhysicalCardOrder {
  id: string;
  cardholderId: string;
  status: string;
  trackingNumber: string | null;
  createdAt: string;
}

export interface IssuingAuthorization {
  id: string;
  virtualCardId: string | null;
  cardExternalId: string;
  externalId: string;
  amountMinor: number;
  currency: string;
  merchantName: string | null;
  merchantCategoryCode: string | null;
  status: string;
  authorizedAt: string;
}

function issuingHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': demoApiKey(),
  };
}

async function issuingFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiV1Base()}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...issuingHeaders(),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const json = (await response.json()) as { data: T; error?: { message: string } };
  if (!response.ok) throw new Error(json.error?.message ?? `HTTP ${response.status}`);
  return json.data;
}

export async function createCardholder(programSlug = 'stipulate_sandbox'): Promise<Cardholder> {
  return issuingFetch<Cardholder>('/issuing/cardholders', {
    method: 'POST',
    body: JSON.stringify({ programSlug }),
  });
}

export async function issueVirtualCard(cardholderId: string): Promise<VirtualCard> {
  return issuingFetch<VirtualCard>('/issuing/cards/virtual', {
    method: 'POST',
    body: JSON.stringify({ cardholderId }),
  });
}

export async function listVirtualCards(cardholderId: string): Promise<VirtualCard[]> {
  const data = await issuingFetch<{ cards: VirtualCard[] }>(
    `/issuing/cards/virtual?cardholderId=${encodeURIComponent(cardholderId)}`,
  );
  return data.cards;
}

export async function updateVirtualCardStatus(
  cardId: string,
  status: VirtualCard['status'],
): Promise<VirtualCard> {
  return issuingFetch<VirtualCard>(`/issuing/cards/virtual/${cardId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function orderPhysicalCard(input: {
  cardholderId: string;
  shippingAddress: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  };
}): Promise<PhysicalCardOrder> {
  return issuingFetch<PhysicalCardOrder>('/issuing/cards/physical/order', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function listPhysicalCardOrders(cardholderId: string): Promise<PhysicalCardOrder[]> {
  const data = await issuingFetch<{ orders: PhysicalCardOrder[] }>(
    `/issuing/cards/physical/orders?cardholderId=${encodeURIComponent(cardholderId)}`,
  );
  return data.orders;
}

export async function listIssuingAuthorizations(cardholderId: string): Promise<IssuingAuthorization[]> {
  const data = await issuingFetch<{ authorizations: IssuingAuthorization[] }>(
    `/issuing/authorizations?cardholderId=${encodeURIComponent(cardholderId)}`,
  );
  return data.authorizations;
}
