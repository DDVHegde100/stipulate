const STRIPE_API = 'https://api.stripe.com/v1';

async function stripeIssuingRequest<T>(
  path: string,
  body?: Record<string, string>,
): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe is not configured');

  const response = await fetch(`${STRIPE_API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body ? new URLSearchParams(body) : undefined,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Stripe Issuing API error: ${response.status} ${err}`);
  }

  return response.json() as Promise<T>;
}

export function isStripeIssuingEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export async function createStripeCardholder(input: {
  name: string;
  email?: string;
  metadata?: Record<string, string>;
}): Promise<{ id: string }> {
  const body: Record<string, string> = {
    name: input.name,
    type: 'individual',
    'billing[address][country]': 'US',
  };
  if (input.email) body.email = input.email;
  for (const [key, value] of Object.entries(input.metadata ?? {})) {
    body[`metadata[${key}]`] = value;
  }

  return stripeIssuingRequest<{ id: string }>('/issuing/cardholders', body);
}

export async function createStripeVirtualCard(input: {
  cardholderId: string;
  currency?: string;
}): Promise<{
  id: string;
  last4: string;
  brand: string;
  exp_month: number;
  exp_year: number;
}> {
  const body: Record<string, string> = {
    cardholder: input.cardholderId,
    type: 'virtual',
    currency: input.currency ?? 'usd',
    status: 'active',
  };

  const cardDesignId = process.env.STRIPE_ISSUING_CARD_DESIGN_ID;
  if (cardDesignId) body.card_design = cardDesignId;

  return stripeIssuingRequest('/issuing/cards', body);
}

export async function updateStripeVirtualCardStatus(input: {
  stripeCardId: string;
  status: 'active' | 'inactive' | 'canceled';
}): Promise<void> {
  await stripeIssuingRequest(`/issuing/cards/${input.stripeCardId}`, {
    status: input.status,
  });
}
