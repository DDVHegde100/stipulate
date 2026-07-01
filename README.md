# Stipulate Platform Specification

**Document ID:** `STIPULATE-README-1.0`  
**Normative status:** Informative (repository root)  
**Maintainer:** `ddvhegde100`  
**License:** MIT

---

## 1. Scope and definitions

### 1.1 Scope

This document specifies the **Stipulate monorepo**: a card-benefit intelligence platform that ingests issuer stipulations, structures benefit rules, enriches merchant transactions, and routes spend to maximize net cardholder return. The specification covers repository topology, runtime surfaces, API contracts at the repository boundary, operational interfaces, and deployment obligations.

### 1.2 Normative terminology

The keywords **MUST**, **MUST NOT**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

### 1.3 Definitions

| Term | Definition |
|------|------------|
| **Benefit rule** | A structured, versioned representation of an issuer benefit (earn rate, cap, exclusion, activation window). |
| **Catalog** | The canonical JSON card registry (`packages/schema/data/cards/`) validated by Zod schemas. |
| **Consumer** | An end-user wallet holder authenticated via session cookies on `/public/auth`. |
| **Enrichment** | Assignment of network-specific merchant category and override metadata to a transaction (`POST /v1/enrich`). |
| **Issuer** | A card network program operator (Chase, Amex, etc.) represented in the catalog. |
| **MCC** | Merchant Category Code per ISO 18245, possibly overridden per issuer. |
| **Organization (Org)** | A B2B API customer scoped by org-scoped API keys. |
| **Routing** | Selection of the optimal card from a wallet for a given transaction (`POST /v1/route`). |
| **Stipulation** | Fine-print benefit language extracted from issuer documents. |
| **Wallet** | The set of cards associated with a consumer or routing request. |

### 1.4 Product identity

- **Name:** Stipulate  
- **Tagline:** Parse the stipulations. Route the payment.  
- **Primary domain:** `stipulate.io`  
- **API origin:** `https://api.stipulate.io`  
- **Package scope:** `@stipulate/*`

---

## 2. System architecture

### 2.1 Logical decomposition

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Client surfaces                          │
│  @stipulate/web (Next.js 15)  @stipulate/mobile (Expo SDK 52)   │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / JSON
┌────────────────────────────▼────────────────────────────────────┐
│                    @stipulate/api (Hono on Node 20)             │
│  /v1/* (org API)  /public/* (consumer)  /admin/*  /webhooks/*   │
└─────┬──────────┬──────────┬──────────┬──────────┬───────────────┘
      │          │          │          │          │
      ▼          ▼          ▼          ▼          ▼
 PostgreSQL   Redis      S3/SQS     Stripe     Plaid
 (state)     (cache/RL)  (async)   (billing)  (link)
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│ Shared packages: schema · parser · routing · mcc · brand · ui │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Monorepo topology

```text
stipulate/
├── apps/
│   ├── api/        # Hono routing API — POST /v1/route, /v1/enrich, issuing, plaid
│   ├── web/        # Next.js 15 marketing, developer console, consumer dashboard
│   ├── mobile/     # Expo SDK 52 iOS/Android consumer wallet
│   └── docs/       # Static OpenAPI and SDK reference host
├── packages/
│   ├── brand/      # Design tokens, logos, Tailwind preset
│   ├── schema/     # Shared Zod schemas and card catalog
│   ├── parser/     # LLM benefit parsing pipeline
│   ├── routing/    # Wallet routing engine and scoring
│   ├── mcc/        # Merchant category enrichment
│   ├── ui/         # React component library
│   └── sdk/        # TypeScript client SDK
├── docker/         # Postgres init, LocalStack bootstrap
├── docs/           # Environment, launch runbook, production checklist
└── .github/        # CI, scheduled jobs, deploy workflows
```

### 2.3 Build orchestration

The monorepo uses **Turborepo** (`turbo.json`) with **pnpm workspaces** (`pnpm-workspace.yaml`). Package graph dependencies MUST respect: `schema` → `routing`, `mcc`, `parser` → `api`; `brand`, `ui`, `schema` → `web`, `mobile`.

---

## 3. Runtime surfaces

### 3.1 API server (`@stipulate/api`)

| Property | Value |
|----------|-------|
| Runtime | Node.js ≥ 20 |
| Framework | Hono 4.x on `@hono/node-server` |
| Default port | `3000` |
| API version prefix | `/v1` (configurable via `API_VERSION`) |

#### 3.1.1 Health and observability endpoints

| Endpoint | Purpose | Success criterion |
|----------|---------|-------------------|
| `GET /health` | Lightweight liveness | HTTP 200, `status: ok` |
| `GET /health/live` | Process liveness probe | HTTP 200 |
| `GET /health/ready` | Readiness (Postgres + Redis) | HTTP 200 when dependencies healthy |
| `GET /status` | Public status page data | HTTP 200, SLO and queue metrics |
| `GET /v1/openapi` | OpenAPI 3.1 specification | HTTP 200 |

#### 3.1.2 Authentication models

1. **Org API keys** — `X-API-Key` header on `/v1/*`; keys are org-scoped, rate-limited per plan.  
2. **Consumer sessions** — HTTP-only cookies on `/public/auth/*` and wallet routes.  
3. **Admin** — `X-Admin-Key` on `/admin/*` via `ADMIN_API_KEY`.  
4. **Webhooks** — Stripe signature (`STRIPE_WEBHOOK_SECRET`), issuing shipping (`ISSUING_WEBHOOK_SECRET`).

#### 3.1.3 Core API operations

```bash
# Routing — select optimal card for a transaction
curl -X POST http://localhost:3000/v1/route \
  -H "Content-Type: application/json" \
  -H "X-API-Key: stip_dev_local_key_change_in_production" \
  -d '{
    "merchant_category_code": "5812",
    "amount_cents": 5000,
    "card_ids": ["chase_sapphire_preferred", "amex_gold"]
  }'

# Enrichment — resolve MCC and issuer overrides before routing
curl -X POST http://localhost:3000/v1/enrich \
  -H "Content-Type: application/json" \
  -H "X-API-Key: stip_dev_local_key_change_in_production" \
  -d '{
    "merchant_name": "Starbucks",
    "mcc": "5814",
    "amount_cents": 650
  }'
```

### 3.2 Web application (`@stipulate/web`)

| Property | Value |
|----------|-------|
| Framework | Next.js 15 (App Router) |
| Default port | `3001` |
| Deployment | Vercel production → `https://stipulate.io` |

Surfaces: marketing, pricing, developer playground, org dashboard, consumer wallet UI, proxy-pay staging.

### 3.3 Mobile application (`@stipulate/mobile`)

| Property | Value |
|----------|-------|
| Framework | Expo SDK 52, Expo Router |
| Bundle IDs | `io.stipulate.app` (iOS/Android) |
| Distribution | EAS Build → App Store / Play Store |

### 3.4 Background workers

Workers run as separate processes (see `apps/api/scripts/`):

| Worker | Schedule | Command |
|--------|----------|---------|
| Webhook supervisor | Continuous | `worker:supervisor` |
| Benefit reparse | Weekly | `schedule:reparse` |
| Stripe reconcile | Weekly | `reconcile:stripe` |
| GDPR purge | Daily | `purge:deletions` |
| Ingestion drain | Every 30 min | `schedule:ingestion` |
| Benefit digest | Weekly | `schedule:digest` |

---

## 4. Data and persistence

### 4.1 PostgreSQL

- **Version:** 16+ (production)  
- **Migrations:** `apps/api/migrations/*.sql` — applied via `pnpm db:migrate`  
- **Seeding:** `db:seed`, `db:seed-benefits --top75|--top150`

### 4.2 Redis

- **Version:** 7+  
- **Uses:** Routing benefit index cache, rate-limit sliding windows, cap spend state  
- **Key prefix:** `REDIS_PREFIX` (default `stipulate:`)

### 4.3 Object storage and queues

- **S3:** Benefit PDFs, parser artifacts  
- **SQS:** Async parser job queue (optional for v1)  
- **Local dev:** LocalStack via `docker compose`

---

## 5. Security model

### 5.1 Production obligations

Production deployments MUST:

1. Set `NODE_ENV=production` and `LOG_LEVEL=info` or `warn`.  
2. Use TLS for `DATABASE_URL` (`sslmode=require`) and `REDIS_URL` (`rediss://`).  
3. Restrict `CORS_ORIGINS` to explicit production hostnames (wildcard `*` is rejected at startup).  
4. Rotate org API keys; the static `API_KEY` env var is for development only.  
5. Configure `SENTRY_DSN` for error tracking.  
6. Enable Stripe webhook signature verification before accepting billing events.

### 5.2 Rate limiting

Org routes apply a Redis-backed sliding-window limiter. In production, Redis outage MUST fail closed (HTTP 503) per `apps/api/src/middleware/rate-limit.ts`.

### 5.3 GDPR

Consumers MAY export data (`GET /public/auth/export`) and schedule deletion (`POST /public/auth/delete`) with a 30-day grace period. Purge runs daily via `purge:deletions`.

---

## 6. Service level objectives

| Metric | Target | Measurement |
|--------|--------|-------------|
| Route P99 latency (warm cache) | < 20 ms | `GET /status` → `checks.slo.routeP99Ms` |
| API error rate (5xx) | < 0.1% | Sentry / PostHog `api.request` |
| Health probe availability | ≥ 99.9% | External monitor on `/health/ready` |
| Webhook delivery success | > 99% | Worker supervisor metrics |

---

## 7. Local development

### 7.1 Prerequisites

| Dependency | Minimum version |
|------------|-----------------|
| Node.js | 20.0.0 |
| pnpm | 9.0.0 |
| Docker | 24+ (for Postgres, Redis, LocalStack) |

### 7.2 Bootstrap sequence

```bash
cp .env.example .env
pnpm install
pnpm docker:up          # Postgres + Redis + LocalStack
pnpm db:migrate
pnpm dev                # Turborepo — all apps

# Individual surfaces
pnpm dev:api            # http://localhost:3000
pnpm dev:web            # http://localhost:3001
pnpm dev:mobile         # Expo dev server
pnpm dev:docs           # Static docs host
```

### 7.3 Verification

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm catalog:validate
pnpm --filter @stipulate/api smoke
```

---

## 8. Build, test, and release

### 8.1 Root scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all packages and apps |
| `pnpm test` | Run all test suites (Vitest, Jest) |
| `pnpm typecheck` | TypeScript validation across workspace |
| `pnpm lint` | ESLint |
| `pnpm format:check` | Prettier validation |
| `pnpm docker:up` | Start local infrastructure |
| `pnpm docker:prod` | Production compose profile |
| `pnpm catalog:validate` | Validate card catalog JSON |

### 8.2 CI pipeline

GitHub Actions workflow `ci.yml` gates merge on: catalog validation, lint, typecheck, unit tests, API smoke, Playwright e2e, production build, and Docker compose smoke (main only).

### 8.3 Production deployment

See [`docs/PRODUCTION.md`](docs/PRODUCTION.md), [`docs/launch.md`](docs/launch.md), and [`docs/stripe-live-checklist.md`](docs/stripe-live-checklist.md).

Deploy triggers:

| Surface | Trigger | Target |
|---------|---------|--------|
| API | Tag `v*.*.*` | Fly.io (`deploy-production.yml`) |
| Web | Vercel main branch | `stipulate.io` |
| Mobile | Tag `v*.*.*` | EAS → stores (`mobile-release.yml`) |

---

## 9. Versioning and compatibility

- **Repository version:** `0.1.0` (see `package.json`)  
- **API version:** `/v1` — breaking changes require a new major API prefix  
- **Catalog:** Semver-independent; validated on every CI run  
- **SDK:** `@stipulate/sdk` tracks `/v1` OpenAPI surface

---

## 10. Contributing and git policy

All commits MUST be authored by the repository maintainer (`ddvhegde100@users.noreply.github.com`). Use:

```bash
pnpm commit -- <conventional-commit-args>
```

Co-authored-by trailers from automated tooling are stripped by Husky hooks. See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`SECURITY.md`](SECURITY.md).

---

## 11. References

| Document | Path |
|----------|------|
| Environment matrix | `docs/environment.md` |
| Production checklist | `docs/PRODUCTION.md` |
| Launch runbook | `docs/launch.md` |
| Monitoring | `docs/monitoring.md` |
| Proxy pay | `docs/PROXY_PAY.md` |
| Branch protection | `docs/branch-protection.md` |
| OpenAPI spec | `apps/api/docs/openapi.yaml` |
| Architecture specification | `docs/ARCHITECTURE.md` |

---

## 12. License

MIT © ddvhegde100
