#!/usr/bin/env tsx
/**
 * API smoke test: migrate, seed, route.
 * Usage: pnpm --filter @stipulate/api smoke
 */
import { createApp } from '../src/app.js';
import { getPool, disconnectDatabase } from '../src/lib/db.js';
import { runMigrations } from '../src/db/migrate.js';
import { connectRedis, disconnectRedis } from '../src/lib/redis.js';

async function main(): Promise<void> {
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'silent';
  process.env.API_KEY = process.env.API_KEY ?? 'test_api_key_ci_16chars';

  const pool = getPool();
  await runMigrations(pool);
  await disconnectDatabase();

  const app = createApp();

  const health = await app.request('/health');
  if (health.status !== 200) {
    throw new Error(`Health check failed: ${health.status}`);
  }

  const route = await app.request('/v1/route', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.API_KEY,
    },
    body: JSON.stringify({
      merchantName: 'Starbucks',
      mcc: '5814',
      amount: { amountMinor: 650, currency: 'USD' },
      userCardIds: ['chase_sapphire_preferred', 'amex_gold'],
    }),
  });

  const body = (await route.json()) as { data?: { bestCardId?: string }; error?: unknown };
  if (route.status !== 200 || !body.data?.bestCardId) {
    throw new Error(`Route smoke failed: ${route.status} ${JSON.stringify(body)}`);
  }

  console.log(`Smoke passed: best card = ${body.data.bestCardId}`);

  const wallet = await app.request('/v1/wallet/cards', {
    headers: { 'X-API-Key': process.env.API_KEY },
  });
  if (wallet.status !== 200) {
    throw new Error(`Wallet smoke failed: ${wallet.status}`);
  }

  const plaid = await app.request('/v1/plaid/link-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.API_KEY,
    },
    body: JSON.stringify({}),
  });
  if (plaid.status !== 200) {
    throw new Error(`Plaid smoke failed: ${plaid.status}`);
  }

  console.log('Wallet and Plaid smoke passed');

  const spendTrack = await app.request('/v1/spend/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.API_KEY,
    },
    body: JSON.stringify({
      userRef: 'smoke-user',
      cardId: 'chase_sapphire_preferred',
      category: 'dining',
      amountMinor: 1500,
    }),
  });
  if (spendTrack.status !== 200) {
    throw new Error(`Spend track smoke failed: ${spendTrack.status}`);
  }

  const spendCaps = await app.request(
    '/v1/spend/caps?user_ref=smoke-user&card_ids=chase_sapphire_preferred',
    { headers: { 'X-API-Key': process.env.API_KEY } },
  );
  if (spendCaps.status !== 200) {
    throw new Error(`Spend caps smoke failed: ${spendCaps.status}`);
  }

  console.log('Spend track and caps smoke passed');

  process.env.FEATURE_PROXY_PAY = 'true';
  const vaultPm = await app.request('/v1/billing/payment-methods', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.API_KEY,
    },
    body: JSON.stringify({
      paymentMethodId: 'pm_smoke_vault',
      setDefault: true,
    }),
  });
  if (vaultPm.status !== 201) {
    throw new Error(`Payment method vault smoke failed: ${vaultPm.status}`);
  }

  const proxyPay = await app.request('/v1/proxy-pay', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.API_KEY,
    },
    body: JSON.stringify({
      merchantName: 'Starbucks',
      mcc: '5814',
      amount: { amountMinor: 650, currency: 'USD' },
      userCardIds: ['chase_sapphire_preferred'],
    }),
  });
  if (proxyPay.status !== 200) {
    throw new Error(`Proxy pay smoke failed: ${proxyPay.status}`);
  }

  const cardholder = await app.request('/v1/issuing/cardholders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.API_KEY,
      'X-Consumer-User-Id': '00000000-0000-4000-8000-000000000099',
    },
    body: JSON.stringify({ programSlug: 'stipulate_sandbox' }),
  });
  if (cardholder.status !== 201) {
    throw new Error(`Issuing cardholder smoke failed: ${cardholder.status}`);
  }

  console.log('Proxy pay, vault, and issuing smoke passed');

  const openApiJson = await app.request('/v1/openapi/json');
  if (openApiJson.status !== 200) {
    throw new Error(`OpenAPI JSON smoke failed: ${openApiJson.status}`);
  }
  const openApiText = await openApiJson.text();
  if (!openApiText.includes('"/public/auth/delete/cancel"')) {
    throw new Error('OpenAPI JSON missing consumer deletion cancel path');
  }
  if (!openApiText.includes('"/org/delete/cancel"')) {
    throw new Error('OpenAPI JSON missing org deletion cancel path');
  }

  console.log('OpenAPI GDPR paths smoke passed');

  await Promise.allSettled([disconnectRedis()]);
}

main().catch((err) => {
  console.error('API smoke failed:', err);
  process.exit(1);
});
