# @stipulate/sdk

Official TypeScript client for the [Stipulate](https://stipulate.io) card benefit API.

## Install

```bash
pnpm add @stipulate/sdk
```

## Quick start

```typescript
import { StipulateClient } from '@stipulate/sdk';

const client = new StipulateClient({
  apiKey: process.env.STIPULATE_API_KEY!,
});

const result = await client.route({
  merchantName: 'Starbucks',
  mcc: '5814',
  amount: { amountMinor: 650, currency: 'USD' },
  userCardIds: ['chase_sapphire_preferred', 'amex_gold'],
});

console.log(result.best.cardId, result.best.returnPct);
```

## Python

See `packages/sdk-python` for the Python client (`pip install stipulate-sdk`).

## Docs

- Web SDK reference: `/docs/sdk`
- OpenAPI spec: `/docs`
