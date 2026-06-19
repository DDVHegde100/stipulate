import { beforeEach, describe, expect, it } from 'vitest';

import { resetEnvCache } from '../config/env.js';
import { notifyConsumersOfBenefitChange } from '../services/benefit-alert.service.js';

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
});
