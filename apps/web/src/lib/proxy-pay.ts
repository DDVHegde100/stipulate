import { demoApiKey, apiV1Base } from './demo-api';

export interface VaultedPaymentMethod {
  id: string;
  paymentMethodId: string;
  label: string | null;
  network: string | null;
  last4: string | null;
  isDefault: boolean;
  consentGivenAt: string;
}

export interface ProxyPayResult {
  requestId: string;
  routing: {
    bestCardId: string;
    estimatedRewardMinor: number;
  };
  paymentIntent: {
    id: string;
    status: 'requires_confirmation' | 'processing' | 'succeeded';
    tokenizedPan?: string;
    network?: string;
    mode?: 'sandbox' | 'stripe';
  };
  computedAt: string;
}

function apiHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': demoApiKey(),
  };
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiV1Base()}${path}`, {
    ...init,
    headers: {
      ...apiHeaders(),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const json = (await response.json()) as { data: T; error?: { message: string } };
  if (!response.ok) throw new Error(json.error?.message ?? `HTTP ${response.status}`);
  return json.data;
}

export async function listVaultedPaymentMethods(): Promise<VaultedPaymentMethod[]> {
  const data = await apiFetch<{ paymentMethods: VaultedPaymentMethod[] }>('/billing/payment-methods');
  return data.paymentMethods;
}

export async function addVaultedPaymentMethod(input: {
  paymentMethodId: string;
  label?: string;
  network?: string;
  last4?: string;
  setDefault?: boolean;
}): Promise<VaultedPaymentMethod> {
  return apiFetch<VaultedPaymentMethod>('/billing/payment-methods', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function removeVaultedPaymentMethod(id: string): Promise<void> {
  await apiFetch<{ removed: boolean }>(`/billing/payment-methods/${id}`, { method: 'DELETE' });
}

export async function proxyPayPurchase(input: {
  merchantName: string;
  mcc: string;
  amountMinor: number;
  userCardIds: string[];
  paymentMethodToken?: string;
}): Promise<ProxyPayResult> {
  return apiFetch<ProxyPayResult>('/proxy-pay', {
    method: 'POST',
    body: JSON.stringify({
      merchantName: input.merchantName,
      mcc: input.mcc,
      amount: { amountMinor: input.amountMinor, currency: 'USD' },
      userCardIds: input.userCardIds,
      paymentMethodToken: input.paymentMethodToken,
    }),
  });
}
