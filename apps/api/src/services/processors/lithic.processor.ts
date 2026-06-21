import { randomBytes } from 'node:crypto';

import type { IssuingProcessor } from './types.js';

/** Lithic processor stub — returns synthetic external IDs until live API keys are wired. */
export const lithicProcessor: IssuingProcessor = {
  kind: 'lithic',
  async createCardholder(input) {
    void input;
    void process.env.LITHIC_API_KEY;
    return {
      externalId: `lithic_ch_${randomBytes(6).toString('hex')}`,
      mode: 'lithic',
    };
  },
  async issueVirtualCard(input) {
    void input;
    const now = new Date();
    return {
      externalId: `lithic_card_${randomBytes(6).toString('hex')}`,
      last4: String(Math.floor(1000 + Math.random() * 9000)),
      network: 'mastercard',
      expMonth: now.getUTCMonth() + 1,
      expYear: now.getUTCFullYear() + 3,
      panToken: `lithic_tok_${randomBytes(8).toString('hex')}`,
      mode: 'lithic',
    };
  },
};
