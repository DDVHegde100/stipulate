# Stipulate production deployment checklist

Use this checklist before pointing production traffic at the API or marketing site.

## Required infrastructure

- [ ] PostgreSQL 16+ with automated backups
- [ ] Plaid sandbox keys for bank linking (`PLAID_CLIENT_ID`, `PLAID_SECRET`)
- [ ] Redis 7+ for routing cache and rate limits
- [ ] S3 (or compatible) for benefit PDFs and parser artifacts
- [ ] SQS (or compatible) for async parser jobs (optional for v1)

## Required secrets

Copy `.env.production.example` to your secret manager. Never commit real values.

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | Postgres connection string with SSL |
| `REDIS_URL` | Yes | Redis connection string |
| `API_KEY` | Dev only | Replace with org-scoped DB keys in production |
| `STRIPE_SECRET_KEY` | Billing | SaaS and consumer subscriptions |
| `STRIPE_PRICE_ID_METERED` | Billing | PAYG metered price (usage reporting) |
| `STRIPE_PRICE_ID_SAAS` | Billing | SaaS flat-rate checkout price |
| `STRIPE_PRICE_ID_CONSUMER` | Billing | Consumer premium checkout price |
| `STRIPE_WEBHOOK_SECRET` | Billing | Webhook signature verification |
| `FEATURE_PROXY_PAY` | Proxy pay | Enable `/v1/proxy-pay` |
| `PLAID_CLIENT_ID` | Plaid | Bank linking (sandbox or production) |
| `PLAID_SECRET` | Plaid | Plaid API secret |
| `ISSUING_WEBHOOK_SECRET` | Issuing | Physical card shipping status callbacks |
| `STRIPE_ISSUING_CARD_DESIGN_ID` | Issuing | Stripe Issuing virtual card design |
| `LITHIC_API_KEY` | Issuing | Lithic processor (optional alternate) |
| `MARQETA_APPLICATION_TOKEN` | Issuing | Marqeta processor (optional alternate) |
| `OPENAI_API_KEY` | Parser | Benefit guide extraction |
| `SENTRY_DSN` | Recommended | Error tracking |
| `ADMIN_API_KEY` | Admin | Internal admin routes |

## Pre-deploy steps

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm --filter @stipulate/schema exec tsx scripts/validate-catalog.ts
pnpm db:migrate
pnpm --filter @stipulate/api db:seed
pnpm --filter @stipulate/api db:seed-benefits --top75
# For full catalog coverage in production:
# pnpm --filter @stipulate/api db:seed-benefits --top150
pnpm build
```

## Post-deploy smoke tests

```bash
curl -sf "$API_URL/health"
curl -sf -X POST "$API_URL/v1/route" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $PRODUCTION_API_KEY" \
  -d '{"merchantName":"Starbucks","mcc":"5814","amount":{"amountMinor":650,"currency":"USD"},"userCardIds":["chase_sapphire_preferred","amex_gold"]}'
```

## Health endpoints

| Endpoint | Expected |
|----------|----------|
| `GET /health` | `200` with postgres + redis status |
| `GET /v1/openapi` | OpenAPI 3.1 spec |
| `GET /status` | Public status page data |

## Rollback

1. Revert the deployment to the previous image/tag.
2. Do **not** roll back migrations automatically; review pending migrations first.
3. Invalidate Redis routing cache if benefit data changed: delete keys matching `stipulate:benefits:*`.

## Stripe webhooks

Configure a single Stripe webhook endpoint pointing at `/webhooks/stripe` with at least:

| Event | Purpose |
|-------|---------|
| `checkout.session.completed` | Org SaaS and consumer premium subscriptions |
| `customer.subscription.deleted` | Downgrade canceled consumer plans |
| `issuing_card.updated` | Sync virtual card freeze/close from Stripe Issuing |
| `issuing_cardholder.updated` | Sync cardholder KYC and suspension state |
| `issuing_authorization.created` | Record virtual card authorizations |
| `issuing_authorization.updated` | Update authorization approval/reversal state |

Physical card shipping uses a separate callback at `/webhooks/issuing/shipping` with `ISSUING_WEBHOOK_SECRET`.

Consumer GDPR exports are available at `GET /public/auth/export` for authenticated wallet users.
Account deletion can be scheduled at `POST /public/auth/delete` (30-day grace period).
Cancel with `POST /public/auth/delete/cancel`. Due deletions are purged daily via `purge:deletions`.

## Scheduled jobs

| Job | Schedule | Command |
|-----|----------|---------|
| GDPR purge | Daily 04:00 UTC | `purge:deletions` |
| Benefit reparse | Mon 06:00 UTC | `schedule:reparse` |
| Stripe reconcile | Mon 06:00 UTC | `reconcile:stripe` |
| Weekly digest | Mon 08:00 UTC | `schedule:digest` |
| Ingestion drain | Every 30 min | `schedule:ingestion` |

## Monitoring

- Route P95 latency target: `<20ms` with warm cache
- API error rate: `<0.1%` excluding 4xx validation errors
- Parser queue depth and benefit publish failures
