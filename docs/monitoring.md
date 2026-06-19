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

## Routing SLO

`GET /status` includes a `checks.slo` block:

- `routeP99LimitMs` — target (default 20ms)
- `routeP50Ms` / `routeP95Ms` / `routeP99Ms` — rolling window from live traffic
- `routeSloBreaches` — count of samples exceeding the limit

Run `pnpm --filter @stipulate/api benchmark:route` locally. Reconcile Stripe meters with `pnpm --filter @stipulate/api reconcile:stripe`.

## Public status endpoint

`GET /status` returns operational health for external uptime monitors (Better Stack, UptimeRobot):

- `checks.postgres` — database latency
- `checks.redis` — cache connectivity
- `checks.workers.ingestionQueueDepth` — queued parser jobs
- `checks.workers.reviewQueueDepth` — jobs awaiting human review
- `checks.features` — enabled product flags

Configure Better Stack to poll `https://api.stipulate.io/status` every 60s. Alert when `status !== operational` for 3 consecutive checks.

## Recommended production alerts

| Signal | Threshold | Action |
|--------|-----------|--------|
| 5xx rate | > 1% over 5m | Page on-call |
| p99 `/v1/route` latency | > 200ms | Investigate Redis benefit index |
| Webhook delivery failures | > 10 in 15m | Check worker supervisor |
| Rate limit 503s | any sustained | Redis outage — fail-closed in production |

## Worker health

The worker supervisor (`pnpm --filter @stipulate/api worker:supervisor`) polls webhook delivery and ingestion queues. Deploy via `apps/api/fly.worker.toml`.
