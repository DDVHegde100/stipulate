import { beforeEach, describe, expect, it } from 'vitest';

import { resetEnvCache } from '../config/env.js';
import { notifyConsumersOfBenefitChange } from '../services/benefit-alert.service.js';

describe('reparse consumer alerts', () => {
  beforeEach(() => {
    resetEnvCache();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
  });

  it('notifies wallet holders when a benefit guide change is detected', async () => {
    const result = await notifyConsumersOfBenefitChange({
      cardId: 'chase_sapphire_preferred',
      cardName: 'Sapphire Preferred',
      changeSummary: 'Issuer benefit guide changed — rules are being re-ingested',
      severity: 'material',
    });

    expect(result.notified).toBe(1);
  });
});
