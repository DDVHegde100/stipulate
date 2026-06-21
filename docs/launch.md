# Stipulate Launch Runbook

Operational checklist for shipping Stipulate v1 to production.

## Pre-launch

1. **Environment** — Copy `.env.example` to production secrets (Fly, Vercel, EAS):
   - `OPENAI_API_KEY` for live benefit ingestion
   - `RESEND_API_KEY` + `RESEND_FROM_EMAIL` for consumer benefit alerts
   - `STRIPE_*` for billing — see [stripe-live-checklist.md](./stripe-live-checklist.md)
   - `SENTRY_DSN`, `POSTHOG_API_KEY` for observability
   - `PLAID_CLIENT_ID` + `PLAID_SECRET` for bank linking
   - `FEATURE_PROXY_PAY=true` only when proxy pay is approved for launch

2. **Database** — Run migrations on production Postgres:
   ```bash
   DATABASE_URL=... pnpm --filter @stipulate/api db:migrate
   pnpm --filter @stipulate/api db:seed-benefits
   pnpm --filter @stipulate/api verify:benefit-coverage --min=75
   ```

3. **Workers** — Deploy worker supervisor (webhooks + ingestion):
   ```bash
   fly deploy --config apps/api/fly.worker.toml
   ```

4. **Smoke tests (local against staging)**
   ```bash
   pnpm --filter @stipulate/api smoke
   ```

5. **Production curl smoke (after deploy)**
   ```bash
   API_URL=https://api.stipulate.io
   curl -fsS "$API_URL/health"
   curl -fsS "$API_URL/status" | jq '.status, .checks.monitoring'
   curl -fsS -X POST "$API_URL/v1/route" \
     -H "Content-Type: application/json" \
     -H "X-API-Key: $PRODUCTION_API_KEY" \
     -d '{"merchantName":"Starbucks","mcc":"5814","amount":{"amountMinor":650,"currency":"USD"},"userCardIds":["chase_sapphire_preferred","amex_gold"]}'
   curl -fsS "$API_URL/v1/openapi/json" | grep -q '"/public/billing/portal"'
   ```

## Deploy surfaces

| Surface | Command / trigger | URL |
|---------|-------------------|-----|
| API | Tag `v*.*.*` → `deploy-production.yml` | `https://api.stipulate.io` |
| Web | Vercel production deploy | `https://stipulate.io` |
| Docs | `pnpm --filter @stipulate/docs start` or static host | `https://docs.stipulate.io` |
| Mobile | Tag `v*.*.*` → `mobile-release.yml` | App Store / Play Store |

See [store-listing.md](./store-listing.md) for App Store copy and screenshot checklist.

## Post-launch monitoring

Poll `GET /status` every 60s (Better Stack / UptimeRobot). Alert when:

| Signal | Threshold | JSON path |
|--------|-----------|-----------|
| Platform down | `status !== "operational"` for 3 checks | `.status` |
| Postgres / Redis | either `checks.postgres.ok` or `checks.redis.ok` is false | `.checks.postgres.ok` |
| Route SLO | `checks.monitoring.routeSloOk === false` | `.checks.monitoring.routeSloOk` |
| Ingestion backlog | `checks.monitoring.ingestionQueueOk === false` | `.checks.workers.ingestionQueueDepth` |
| Stripe readiness | `checks.monitoring.stripe.liveMode === false` after go-live | `.checks.monitoring.stripe` |

Additional dashboards:

- PostHog `api.request` p99 for `/v1/route`
- Sentry error rate for `@stipulate/api`
- Reconcile Stripe meters weekly: `pnpm --filter @stipulate/api reconcile:stripe`

Public status page: `https://stipulate.io/status`

## Rollback

1. **API** — `fly releases list` then `fly deploy --image <previous>`
2. **Web** — Vercel instant rollback to prior deployment
3. **Mobile** — Submit prior build from EAS dashboard
4. **Stripe** — Revert to test keys; do not delete live customers (see stripe checklist)

## Mobile App Store

1. Configure `EXPO_TOKEN` in GitHub secrets for CI preview builds.
2. Set production env in EAS (`EXPO_PUBLIC_API_URL`, consumer auth).
3. Build and submit:
   ```bash
   cd apps/mobile
   eas build --profile production --platform all
   eas submit --profile production --platform ios
   eas submit --profile production --platform android
   ```
4. Verify deep links: `stipulate://app/route`, `stipulate://login`, `https://stipulate.io/app/wallet`.
5. Set `EXPO_PUBLIC_PUSH_TOKEN` in EAS secrets for production push alerts.
6. Confirm `/privacy` and `/terms` are live before store submission.

## Scheduled jobs

| Job | Schedule | Command |
|-----|----------|---------|
| GDPR purge | Daily 04:00 UTC | `purge:deletions` |
| Benefit reparse | Mon 06:00 UTC | `schedule:reparse` |
| Weekly digest | Mon 08:00 UTC | `schedule:digest` |
| Ingestion drain | Every 30 min | `schedule:ingestion` |
| Stripe reconcile | Mon 06:00 UTC | `reconcile:stripe` |

## On-call contacts

Configure `ops@stipulate.io` in PagerDuty. Link this runbook in the incident channel.

## Related docs

- [PRODUCTION.md](./PRODUCTION.md) — infrastructure checklist
- [stripe-live-checklist.md](./stripe-live-checklist.md) — billing go-live
- [PROXY_PAY.md](./PROXY_PAY.md) — proxy pay enablement
