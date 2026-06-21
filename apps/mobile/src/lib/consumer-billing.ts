import Constants from 'expo-constants';

import { getStoredUser } from './consumer-auth';

export interface ConsumerBillingStatus {
  plan: string;
  status: string;
  isPremium: boolean;
}

function publicApiBase(): string {
  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  const apiUrl = extra?.apiUrl ?? 'http://localhost:3000/v1';
  return apiUrl.replace(/\/v1$/, '');
}

export async function fetchConsumerBillingStatus(): Promise<ConsumerBillingStatus> {
  const user = await getStoredUser();
  if (!user) throw new Error('Not signed in');

  const response = await fetch(`${publicApiBase()}/public/billing/status`, {
    headers: { 'X-User-Id': user.id },
    credentials: 'include',
  });

  const json = (await response.json()) as {
    data: ConsumerBillingStatus;
    error?: { message: string };
  };

  if (!response.ok) {
    throw new Error(json.error?.message ?? `HTTP ${response.status}`);
  }

  return json.data;
}

export async function startConsumerCheckout(input: {
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string }> {
  const user = await getStoredUser();
  if (!user) throw new Error('Not signed in');

  const response = await fetch(`${publicApiBase()}/public/billing/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': user.id,
    },
    credentials: 'include',
    body: JSON.stringify(input),
  });

  const json = (await response.json()) as {
    data: { url: string };
    error?: { message: string };
  };

  if (!response.ok) {
    throw new Error(json.error?.message ?? `HTTP ${response.status}`);
  }

  return json.data;
}

export async function startConsumerPortal(input: { returnUrl: string }): Promise<{ url: string }> {
  const user = await getStoredUser();
  if (!user) throw new Error('Not signed in');

  const response = await fetch(`${publicApiBase()}/public/billing/portal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': user.id,
    },
    credentials: 'include',
    body: JSON.stringify(input),
  });

  const json = (await response.json()) as {
    data: { url: string };
    error?: { message: string };
  };

  if (!response.ok) {
    throw new Error(json.error?.message ?? `HTTP ${response.status}`);
  }

  return json.data;
}
