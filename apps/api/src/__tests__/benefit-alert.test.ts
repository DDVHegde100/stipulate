import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resetEnvCache } from '../config/env.js';
import { notifyConsumersOfBenefitChange } from '../services/benefit-alert.service.js';
import * as consumerRepo from '../repositories/consumer-user.repository.js';

describe('benefit alert emails', () => {
  beforeEach(() => {
    resetEnvCache();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
  });

  it('notifies consumers with matching wallet cards', async () => {
    const result = await notifyConsumersOfBenefitChange({
      cardId: 'chase_sapphire_preferred',
      cardName: 'Sapphire Preferred',
      changeSummary: 'Dining multiplier reduced from 3x to 2x',
      severity: 'material',
    });

    expect(result.notified).toBe(1);
    expect(result.pushed).toBe(0);
  });

  it('skips consumers without the card in wallet', async () => {
    const result = await notifyConsumersOfBenefitChange({
      cardId: 'capital_one_venture',
      changeSummary: 'No change',
      severity: 'minor',
    });

    expect(result.notified).toBe(0);
    expect(result.pushed).toBe(0);
  });

  it('sends push notifications when push alerts are enabled', async () => {
    vi.spyOn(consumerRepo, 'listConsumersForCard').mockResolvedValue([
      {
        id: '00000000-0000-4000-8000-000000000001',
        email: 'demo@stipulate.io',
        name: 'Demo User',
        password_hash: null,
        timezone: 'UTC',
        onboarding_complete: true,
        wallet_card_ids: ['chase_sapphire_preferred'],
        notification_prefs: { email: false, push: true },
        expo_push_token: 'ExponentPushToken[test]',
      },
    ]);

    const result = await notifyConsumersOfBenefitChange({
      cardId: 'chase_sapphire_preferred',
      cardName: 'Sapphire Preferred',
      changeSummary: 'Travel credit increased',
      severity: 'material',
    });

    expect(result.notified).toBe(0);
    expect(result.pushed).toBe(1);
  });
});
