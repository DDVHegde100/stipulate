# Stripe live mode checklist

Complete before switching production billing from test to live keys.

## Dashboard setup

- [ ] Activate Stripe account and complete business verification
- [ ] Create live **Consumer Premium** product + recurring price → `STRIPE_PRICE_ID_CONSUMER`
- [ ] Create live **SaaS** flat price → `STRIPE_PRICE_ID_SAAS`
- [ ] Create live **metered** price for PAYG → `STRIPE_PRICE_ID_METERED`
- [ ] Enable Customer Portal for subscription management
- [ ] Configure Issuing program (if virtual cards enabled) → `STRIPE_ISSUING_CARD_DESIGN_ID`

## API secrets (Fly / secret manager)

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_CONSUMER=price_...
STRIPE_PRICE_ID_SAAS=price_...
STRIPE_PRICE_ID_METERED=price_...
FEATURE_PROXY_PAY=true   # only if proxy pay is in scope for launch
```

## Webhook endpoint

Point Stripe to `https://api.stipulate.io/webhooks/stripe` with:

| Event | Required |
|-------|----------|
| `checkout.session.completed` | Yes |
| `customer.subscription.deleted` | Yes |
| `issuing_card.updated` | If issuing enabled |
| `issuing_cardholder.updated` | If issuing enabled |
| `issuing_authorization.created` | If issuing enabled |
| `issuing_authorization.updated` | If issuing enabled |

Verify with:

```bash
curl -fsS https://api.stipulate.io/status | jq '.checks.monitoring.stripe'
```

Expect `liveMode: true`, `webhookConfigured: true`, `consumerPriceConfigured: true`.

## Post-switch smoke

1. Consumer checkout from `/app/settings` (test card in live mode — use real small charge or Stripe test clock)
2. Billing portal cancel/resubscribe flow
3. Developer dashboard billing page loads meter usage
4. Weekly reconcile: `pnpm --filter @stipulate/api reconcile:stripe`

## Rollback

Revert `STRIPE_SECRET_KEY` to test key and redeploy API. Do not delete live Stripe customers.
