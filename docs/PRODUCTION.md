# Stipulate production deployment checklist

Use this checklist before pointing production traffic at the API or marketing site.

## Required infrastructure

- [ ] PostgreSQL 16+ with automated backups
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
| `STRIPE_WEBHOOK_SECRET` | Billing | Webhook signature verification |
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
pnpm --filter @stipulate/api db:seed-benefits
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

## Monitoring

- Route P95 latency target: `<20ms` with warm cache
- API error rate: `<0.1%` excluding 4xx validation errors
- Parser queue depth and benefit publish failures
