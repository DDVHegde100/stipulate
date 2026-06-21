import { describe, expect, it, beforeEach } from 'vitest';

import { resetEnvCache } from '../config/env.js';
import { resetDatabasePool } from '../lib/db.js';
import { resetRedisClient } from '../lib/redis.js';
import {
  cancelConsumerDeletion,
  getConsumerDeletionStatus,
  markTestConsumerDeletionDue,
  scheduleConsumerDeletion,
} from '../services/consumer-gdpr.service.js';
import { cancelOrgDeletion, scheduleOrgDeletion } from '../services/org-gdpr.service.js';
import { purgeDueDeletions } from '../services/gdpr-purge.service.js';
import { createApp } from '../app.js';

describe('GDPR purge and deletion cancel', () => {
  beforeEach(() => {
    resetEnvCache();
    resetDatabasePool();
    resetRedisClient();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
    process.env.API_KEY = 'test_api_key_ci_16chars';
  });

  it('purgeDueDeletions removes due consumer deletion records', async () => {
    const userId = '00000000-0000-4000-8000-000000000001';
    await scheduleConsumerDeletion(userId);
    markTestConsumerDeletionDue(userId);

    const summary = await purgeDueDeletions();
    expect(summary.consumersPurged).toBe(1);
    expect(await getConsumerDeletionStatus(userId)).toBeNull();
  });

  it('cancelConsumerDeletion clears a scheduled request', async () => {
    const userId = '00000000-0000-4000-8000-000000000002';
    await scheduleConsumerDeletion(userId);

    const cancelled = await cancelConsumerDeletion(userId);
    expect(cancelled.cancelled).toBe(true);
    expect(await getConsumerDeletionStatus(userId)).toBeNull();
  });

  it('POST /public/auth/delete/cancel cancels scheduled deletion', async () => {
    const app = createApp();
    const userId = '00000000-0000-4000-8000-000000000001';

    await scheduleConsumerDeletion(userId);

    const response = await app.request('/public/auth/delete/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
      },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.status).toBe('cancelled');
  });

  it('POST /v1/org/delete/cancel cancels scheduled org deletion', async () => {
    const app = createApp();
    const orgId = '00000000-0000-4000-8000-000000000001';
    await scheduleOrgDeletion(orgId);

    const response = await app.request('/v1/org/delete/cancel', {
      method: 'POST',
      headers: { 'X-API-Key': process.env.API_KEY! },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.status).toBe('cancelled');

    const again = await cancelOrgDeletion(orgId);
    expect(again.cancelled).toBe(false);
  });
});
