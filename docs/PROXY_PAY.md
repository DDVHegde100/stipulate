# Proxy Pay

Proxy pay combines Stipulate card routing with a tokenized payment intent. A single API call returns the best card for rewards plus a payment intent stub (sandbox) or Stripe PaymentIntent (when configured).

## Enable

Set environment variables on the API:

```bash
FEATURE_PROXY_PAY=true
STRIPE_SECRET_KEY=sk_live_...   # optional; enables live Stripe intents for pm_ tokens
```

Without `STRIPE_SECRET_KEY`, proxy pay runs in sandbox mode and returns synthetic payment intent IDs.

## Endpoint

`POST /v1/proxy-pay`

Headers:

- `Content-Type: application/json`
- `X-API-Key: <org api key>`

Body (extends route request):

```json
{
  "merchantName": "Starbucks",
  "mcc": "5814",
  "amount": { "amountMinor": 650, "currency": "USD" },
  "userCardIds": ["chase_sapphire_preferred", "amex_gold"],
  "paymentMethodToken": "pm_1234567890",
  "idempotencyKey": "order-abc-123"
}
```

Response:

```json
{
  "data": {
    "requestId": "req_...",
    "routing": {
      "bestCardId": "chase_sapphire_preferred",
      "estimatedRewardMinor": 32
    },
    "paymentIntent": {
      "id": "pi_...",
      "status": "requires_confirmation",
      "mode": "sandbox"
    },
    "computedAt": "2026-06-19T12:00:00.000Z"
  }
}
```

## Vaulted payment methods

Organizations can store Stripe payment method IDs for repeat proxy-pay without passing a token on every request.

### Vault API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/billing/payment-methods` | List vaulted methods |
| POST | `/v1/billing/payment-methods` | Add or update a method |
| DELETE | `/v1/billing/payment-methods/:id` | Remove a method |

POST body:

```json
{
  "paymentMethodId": "pm_1ABC...",
  "label": "Corporate Visa",
  "network": "visa",
  "last4": "4242",
  "setDefault": true
}
```

When `paymentMethodToken` is omitted on proxy-pay, the org's default vaulted method is used automatically.

## Production requirements

In production (`NODE_ENV=production`), proxy pay requires either:

1. `paymentMethodToken` in the request body, or
2. A default vaulted payment method for the org (via API key context)

## Web demo

The consumer app includes `/app/proxy-pay` for interactive testing:

- Vault demo payment methods
- Run proxy pay against wallet cards
- Inspect routing + payment intent response

Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_DEMO_API_KEY` to point at your API.

## Idempotency

Proxy pay routes use the shared idempotency middleware. Pass `Idempotency-Key` header or `idempotencyKey` in the body for safe retries.

## Related

- Card issuing (virtual/physical): `/v1/issuing/*`
- Routing only: `POST /v1/route`
- Production checklist: [PRODUCTION.md](./PRODUCTION.md)
