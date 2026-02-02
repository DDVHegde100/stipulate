# Stipulate

**Parse the stipulations. Route the payment.**

Card benefit intelligence API — parses fine-print benefit terms from 200+ US cards, enriches merchant category codes, and routes spend to the card that maximizes net return.

## Monorepo structure

```
stipulate/
├── apps/
│   ├── api/        # Hono routing API (POST /v1/route, /v1/enrich)
│   ├── web/        # Next.js 15 marketing + product web app
│   └── mobile/     # Expo SDK 52 iOS/Android app
├── packages/
│   ├── brand/      # Design tokens, logos, Tailwind preset
│   ├── schema/     # Shared Zod schemas
│   ├── parser/     # LLM benefit parsing pipeline
│   ├── mcc/        # Merchant category enrichment
│   └── ui/         # React component library
├── docker/         # Postgres init, LocalStack bootstrap
└── docs/           # Environment, branch protection
```

## Quick start

```bash
# Prerequisites: Node 20+, pnpm 9+, Docker

cp .env.example .env
pnpm install
pnpm docker:up          # Postgres + Redis + LocalStack
pnpm dev                # Start all apps

# Individual apps
pnpm dev:api            # http://localhost:3000
pnpm dev:web            # http://localhost:3001
pnpm dev:mobile         # Expo dev server
```

## API

```bash
curl -X POST http://localhost:3000/v1/route \
  -H "Content-Type: application/json" \
  -H "X-API-Key: stip_dev_local_key_change_in_production" \
  -d '{
    "merchant_category_code": "5812",
    "amount_cents": 5000,
    "card_ids": ["chase_sapphire_preferred", "amex_gold"]
  }'
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all packages and apps |
| `pnpm test` | Run all test suites |
| `pnpm typecheck` | TypeScript validation |
| `pnpm lint` | ESLint across monorepo |
| `pnpm docker:up` | Start local infrastructure |

## License

MIT © ddvhegde100
