import { beforeEach, describe, expect, it } from 'vitest';

import { resetEnvCache } from '../config/env.js';
import { sendWeeklyBenefitDigest } from '../services/benefit-digest.service.js';

describe('weekly benefit digest', () => {
  beforeEach(() => {
    resetEnvCache();
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'silent';
  });

  it('sends digest when changelog events exist in test mode', async () => {
    const result = await sendWeeklyBenefitDigest(7);
    expect(result.emailed).toBe(1);
    expect(result.events).toBe(1);
  });
});
