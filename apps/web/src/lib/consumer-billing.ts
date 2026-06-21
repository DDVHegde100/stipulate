function publicApiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1').replace(/\/v1$/, '');
}

export interface ConsumerBillingStatus {
  plan: string;
  status: string;
  isPremium: boolean;
}

export async function fetchConsumerBillingStatus(): Promise<ConsumerBillingStatus> {
  const response = await fetch(`${publicApiBase()}/public/billing/status`, {
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
  const response = await fetch(`${publicApiBase()}/public/billing/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
