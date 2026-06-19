# Monitoring

Stipulate emits observability signals through lightweight HTTP integrations — no heavy SDK required in the API process.

## Error tracking (Sentry)

Set `SENTRY_DSN` in production. Unhandled exceptions in `@stipulate/api` are reported via the Sentry envelope API from `apps/api/src/lib/observability.ts`.

## Product analytics (PostHog)

Set `POSTHOG_API_KEY` and optionally `POSTHOG_HOST`. The API emits:

- `api.startup` on boot
- `api.request` per HTTP request (path, status, latency, org)
- `waitlist.signup` when a lead joins the marketing waitlist

## Request metrics middleware

`apps/api/src/middleware/metrics.ts` wraps all `/v1/*` routes and forwards timing data to PostHog after each response.

## Recommended production alerts

| Signal | Threshold | Action |
|--------|-----------|--------|
| 5xx rate | > 1% over 5m | Page on-call |
| p99 `/v1/route` latency | > 200ms | Investigate Redis benefit index |
| Webhook delivery failures | > 10 in 15m | Check worker supervisor |
| Rate limit 503s | any sustained | Redis outage — fail-closed in production |

## Worker health

The worker supervisor (`pnpm --filter @stipulate/api worker:supervisor`) polls webhook delivery and ingestion queues. Deploy via `apps/api/fly.worker.toml`.
