import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import { resetEnvCache } from '../config/env.js';
import { resetDatabasePool } from '../lib/db.js';
import { resetRedisClient } from '../lib/redis.js';

describe('org payment method vault API', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.API_KEY = 'test_api_key_ci_16chars';
    process.env.FEATURE_PROXY_PAY = 'true';
  });

  it('POST /v1/billing/payment-methods vaults and lists methods', async () => {
    const app = createApp();

    const created = await app.request('/v1/billing/payment-methods', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.API_KEY!,
      },
      body: JSON.stringify({
        paymentMethodId: 'pm_test_vault_4242',
        label: 'Demo Visa',
        network: 'visa',
        last4: '4242',
        setDefault: true,
      }),
    });

    expect(created.status).toBe(201);
    const createdBody = await created.json();
    expect(createdBody.data.isDefault).toBe(true);

    const listed = await app.request('/v1/billing/payment-methods', {
      headers: { 'X-API-Key': process.env.API_KEY! },
    });
    expect(listed.status).toBe(200);
    const listBody = await listed.json();
    expect(listBody.data.paymentMethods).toHaveLength(1);
  });

  it('DELETE /v1/billing/payment-methods/:id removes a vaulted method', async () => {
    const app = createApp();

    const created = await app.request('/v1/billing/payment-methods', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.API_KEY!,
      },
      body: JSON.stringify({
        paymentMethodId: 'pm_test_remove_me',
        setDefault: true,
      }),
    });
    const createdBody = await created.json();

    const removed = await app.request(`/v1/billing/payment-methods/${createdBody.data.id}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': process.env.API_KEY! },
    });
    expect(removed.status).toBe(200);

    const listed = await app.request('/v1/billing/payment-methods', {
      headers: { 'X-API-Key': process.env.API_KEY! },
    });
    const listBody = await listed.json();
    expect(listBody.data.paymentMethods.some((m: { id: string }) => m.id === createdBody.data.id)).toBe(
      false,
    );
  });

  it('POST /v1/proxy-pay uses default vaulted payment method', async () => {
    const app = createApp();

    await app.request('/v1/billing/payment-methods', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.API_KEY!,
      },
      body: JSON.stringify({
        paymentMethodId: 'pm_default_vaulted',
        setDefault: true,
      }),
    });

    const response = await app.request('/v1/proxy-pay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.API_KEY!,
      },
      body: JSON.stringify({
        merchantName: 'Starbucks',
        mcc: '5814',
        amount: { amountMinor: 650, currency: 'USD' },
        userCardIds: ['chase_sapphire_preferred'],
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.routing.bestCardId).toBeTruthy();
    expect(body.data.paymentIntent.status).toBe('requires_confirmation');
  });
});
