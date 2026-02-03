# Environment-specific configuration for Stipulate deployments

## Overview

Stipulate uses a single `.env.example` as the source of truth for all environment variables.
Copy it to `.env` locally. In staging/production, inject secrets via your platform's secret manager.

| Environment | API URL | Web URL | Database | Notes |
|-------------|---------|---------|----------|-------|
| **local** | `http://localhost:3000` | `http://localhost:3001` | Docker Postgres | LocalStack for AWS |
| **staging** | `https://api.staging.stipulate.io` | `https://staging.stipulate.io` | RDS staging | Stripe test mode |
| **production** | `https://api.stipulate.io` | `https://stipulate.io` | RDS production | Stripe live mode |

## Local Development

```bash
cp .env.example .env
pnpm docker:up          # Postgres + Redis + LocalStack
pnpm install
pnpm dev                # All apps via Turborepo
```

## Staging

Set these in your deployment platform (Fly.io / Railway / Vercel):

```env
NODE_ENV=staging
DATABASE_URL=<staging-rds-url>
REDIS_URL=<staging-redis-url>
API_KEY=<rotated-staging-key>
CORS_ORIGINS=https://staging.stipulate.io
AWS_ENDPOINT_URL=          # empty — use real AWS
SENTRY_DSN=<staging-sentry>
```

Deploy API to Fly.io/Railway, Web to Vercel, with staging branch auto-deploy.

## Production

```env
NODE_ENV=production
DATABASE_URL=<prod-rds-url>
REDIS_URL=<prod-redis-url>
API_KEY=<rotated-prod-key>
CORS_ORIGINS=https://stipulate.io,https://www.stipulate.io
LOG_LEVEL=info
DATABASE_SSL=true
FEATURE_PROXY_PAY=false
```

### Production checklist

- [ ] Rotate all secrets from staging
- [ ] Enable RDS automated backups (7-day retention)
- [ ] Configure Redis persistence (AOF)
- [ ] Set up CloudWatch / Datadog alerts on p99 latency > 20ms
- [ ] Enable Stripe live mode webhooks
- [ ] Configure WAF on API gateway

## Secret rotation

| Secret | Rotation cadence | Owner |
|--------|------------------|-------|
| `API_KEY` | 90 days | Platform |
| `DATABASE_URL` password | 90 days | Infra |
| `NEXTAUTH_SECRET` | On breach only | Web |
| `STRIPE_*` | On personnel change | Billing |
| `OPENAI_API_KEY` | 180 days | Parser |

## Config loading order

1. Platform-injected env vars (highest priority)
2. `.env.local` (gitignored, local overrides)
3. `.env` (gitignored, local defaults)
4. Zod schema defaults in `apps/api/src/config/env.ts`
