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

const TS_ISSUING = `const cardholder = await client.createCardholder({ programSlug: 'stipulate_sandbox' });
const card = await client.issueVirtualCard({ cardholderId: cardholder.id });
await client.updateVirtualCardStatus(card.id, { status: 'frozen' });`;

const TS_VAULT = `const methods = await client.listVaultedPaymentMethods();
await client.vaultPaymentMethod({
  paymentMethodId: 'pm_card_visa',
  label: 'Corporate Visa',
  setDefault: true,
});`;

const PY_ROUTE = `from stipulate import StipulateClient

client = StipulateClient("sk_live_...", base_url="https://api.stipulate.io/v1")

result = client.route({
    "merchantName": "Nobu",
    "mcc": "5812",
    "amount": {"amountMinor": 8742, "currency": "USD"},
    "userCardIds": ["amex_gold", "chase_sapphire_reserve"],
})

print(result["bestCardId"], result["rankedCards"][0]["effectiveMultiplier"])`;

const CONSUMER_AUTH = `# Consumer app auth (session cookie or X-User-Id header)
curl -X POST https://api.stipulate.io/public/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com","password":"..."}' \\
  -c cookies.txt

curl https://api.stipulate.io/public/auth/export -b cookies.txt
curl -X POST https://api.stipulate.io/public/auth/delete -b cookies.txt`;

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
          Vault & issuing
        </Heading>
        <pre className="overflow-x-auto rounded-xl border border-glass-border bg-ink-900 p-4 font-mono text-[13px] leading-relaxed text-white/80">
          {TS_VAULT}
        </pre>
        <pre className="overflow-x-auto rounded-xl border border-glass-border bg-ink-900 p-4 font-mono text-[13px] leading-relaxed text-white/80">
          {TS_ISSUING}
        </pre>
      </GlassPanel>

      <GlassPanel className="space-y-4">
        <Heading as="h2" size="sm">
          Consumer privacy API
        </Heading>
        <Text tone="secondary">
          Wallet users can export or schedule deletion via session-authenticated public routes.
        </Text>
        <pre className="overflow-x-auto rounded-xl border border-glass-border bg-ink-900 p-4 font-mono text-[13px] leading-relaxed text-white/80">
          {CONSUMER_AUTH}
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
