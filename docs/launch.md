# Stipulate Launch Runbook

Operational checklist for shipping Stipulate v1 to production.

## Pre-launch

1. **Environment** — Copy `.env.example` to production secrets (Fly, Vercel, EAS):
   - `OPENAI_API_KEY` for live benefit ingestion
   - `RESEND_API_KEY` + `RESEND_FROM_EMAIL` for consumer benefit alerts
   - `STRIPE_*` for billing
   - `SENTRY_DSN`, `POSTHOG_API_KEY` for observability

2. **Database** — Run migrations on production Postgres:
   ```bash
   DATABASE_URL=... pnpm --filter @stipulate/api db:migrate
   pnpm --filter @stipulate/api db:seed-benefits
   ```

3. **Workers** — Deploy worker supervisor (webhooks + ingestion):
   ```bash
   fly deploy --config apps/api/fly.worker.toml
   ```

4. **Smoke tests**
   ```bash
   curl https://api.stipulate.io/status
   curl -X POST https://api.stipulate.io/v1/route -H "X-API-Key: $KEY" -d '{...}'
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

- Poll `GET /status` every 60s (Better Stack / UptimeRobot)
- Alert on `status !== operational` for 3 consecutive checks
- Watch PostHog `api.request` p99 for `/v1/route`
- Reconcile Stripe meters weekly: `pnpm --filter @stipulate/api reconcile:stripe`

## Rollback

1. **API** — `fly releases list` then `fly deploy --image <previous>`
2. **Web** — Vercel instant rollback to prior deployment
3. **Mobile** — Submit prior build from EAS dashboard

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
| Benefit reparse | Mon 06:00 UTC | `schedule:reparse` |
| Weekly digest | Mon 08:00 UTC | `schedule:digest` |
| Ingestion drain | Every 30 min | `schedule:ingestion` |

## On-call contacts

Configure `ops@stipulate.io` in PagerDuty. Link runbook in incident channel.
