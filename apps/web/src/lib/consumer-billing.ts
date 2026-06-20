function publicApiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1').replace(/\/v1$/, '');
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
