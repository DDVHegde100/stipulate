'use client';

import { GlassPanel, Heading, Text } from '@stipulate/ui';

const TS_ROUTE = `import { StipulateClient } from '@stipulate/sdk';

const client = new StipulateClient({
  apiKey: process.env.STIPULATE_API_KEY!,
});

const result = await client.route({
  merchantName: 'Nobu',
  mcc: '5812',
  amount: { amountMinor: 8742, currency: 'USD' },
  userCardIds: ['amex_gold', 'chase_sapphire_reserve'],
});

console.log(result.bestCardId, result.rankedCards[0]?.effectiveMultiplier);`;

const TS_PROXY = `const payment = await client.proxyPay({
  merchantName: 'Whole Foods',
  mcc: '5411',
  amount: { amountMinor: 5000, currency: 'USD' },
  userCardIds: ['amex_gold'],
});

console.log(payment.paymentIntent.id);`;

const PY_ROUTE = `from stipulate import StipulateClient

client = StipulateClient("sk_live_...", base_url="https://api.stipulate.io/v1")

result = client.route({
    "merchantName": "Nobu",
    "mcc": "5812",
    "amount": {"amountMinor": 8742, "currency": "USD"},
    "userCardIds": ["amex_gold", "chase_sapphire_reserve"],
})

print(result["best"]["cardId"], result["best"]["returnPct"])`;

const INSTALL = [
  { label: 'TypeScript / Node', command: 'pnpm add @stipulate/sdk' },
  { label: 'Python', command: 'pip install stipulate-sdk' },
] as const;

export function SdkDocsPanel() {
  return (
    <div className="space-y-8">
      <GlassPanel className="space-y-4">
        <Heading as="h2" size="sm">
          Install
        </Heading>
        {INSTALL.map(({ label, command }) => (
          <div key={label}>
            <Text variant="overline" tone="secondary" className="mb-2 block">
              {label}
            </Text>
            <pre className="overflow-x-auto rounded-xl border border-glass-border bg-ink-900 p-4 font-mono text-sm text-white/80">
              {command}
            </pre>
          </div>
        ))}
      </GlassPanel>

      <GlassPanel className="space-y-4">
        <Heading as="h2" size="sm">
          Route a purchase
        </Heading>
        <Text tone="secondary">Pick the best card for a merchant and amount.</Text>
        <pre className="overflow-x-auto rounded-xl border border-glass-border bg-ink-900 p-4 font-mono text-[13px] leading-relaxed text-white/80">
          {TS_ROUTE}
        </pre>
      </GlassPanel>

      <GlassPanel className="space-y-4">
        <Heading as="h2" size="sm">
          Proxy pay
        </Heading>
        <Text tone="secondary">Charge the optimal card via Stipulate proxy pay.</Text>
        <pre className="overflow-x-auto rounded-xl border border-glass-border bg-ink-900 p-4 font-mono text-[13px] leading-relaxed text-white/80">
          {TS_PROXY}
        </pre>
      </GlassPanel>

      <GlassPanel className="space-y-4">
        <Heading as="h2" size="sm">
          Python
        </Heading>
        <pre className="overflow-x-auto rounded-xl border border-glass-border bg-ink-900 p-4 font-mono text-[13px] leading-relaxed text-white/80">
          {PY_ROUTE}
        </pre>
      </GlassPanel>
    </div>
  );
}
