import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CARDHOLDER_KEY = '@stipulate/cardholder_id';

const extra = Constants.expoConfig?.extra as { apiUrl?: string; apiKey?: string } | undefined;
const API_BASE = extra?.apiUrl ?? 'http://localhost:3000/v1';
const API_KEY = extra?.apiKey ?? 'stip_dev_local_key_change_in_production';

export interface VirtualCard {
  id: string;
  cardholderId: string;
  last4: string;
  network: string;
  status: 'active' | 'frozen' | 'closed';
}

export interface IssuingAuthorization {
  id: string;
  externalId: string;
  amountMinor: number;
  currency: string;
  merchantName: string | null;
  status: string;
  authorizedAt: string;
}

function headers(consumerUserId: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    'X-Consumer-User-Id': consumerUserId,
  };
}

async function issuingFetch<T>(consumerUserId: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...headers(consumerUserId),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const json = (await response.json()) as { data: T; error?: { message: string } };
  if (!response.ok) throw new Error(json.error?.message ?? `HTTP ${response.status}`);
  return json.data;
}

export async function getStoredCardholderId(): Promise<string | null> {
  return AsyncStorage.getItem(CARDHOLDER_KEY);
}

export async function storeCardholderId(id: string): Promise<void> {
  await AsyncStorage.setItem(CARDHOLDER_KEY, id);
}

export async function ensureCardholder(consumerUserId: string): Promise<string> {
  const existing = await getStoredCardholderId();
  if (existing) return existing;

  const cardholder = await issuingFetch<{ id: string }>(consumerUserId, '/issuing/cardholders', {
    method: 'POST',
    body: JSON.stringify({ programSlug: 'stipulate_sandbox' }),
  });
  await storeCardholderId(cardholder.id);
  return cardholder.id;
}

export async function listVirtualCards(
  consumerUserId: string,
  cardholderId: string,
): Promise<VirtualCard[]> {
  const data = await issuingFetch<{ cards: VirtualCard[] }>(
    consumerUserId,
    `/issuing/cards/virtual?cardholderId=${encodeURIComponent(cardholderId)}`,
  );
  return data.cards;
}

export async function issueVirtualCard(
  consumerUserId: string,
  cardholderId: string,
): Promise<VirtualCard> {
  return issuingFetch<VirtualCard>(consumerUserId, '/issuing/cards/virtual', {
    method: 'POST',
    body: JSON.stringify({ cardholderId }),
  });
}

export async function updateVirtualCardStatus(
  consumerUserId: string,
  cardId: string,
  status: VirtualCard['status'],
): Promise<VirtualCard> {
  return issuingFetch<VirtualCard>(consumerUserId, `/issuing/cards/virtual/${cardId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function listIssuingAuthorizations(
  consumerUserId: string,
  cardholderId: string,
): Promise<IssuingAuthorization[]> {
  const data = await issuingFetch<{ authorizations: IssuingAuthorization[] }>(
    consumerUserId,
    `/issuing/authorizations?cardholderId=${encodeURIComponent(cardholderId)}`,
  );
  return data.authorizations;
}
