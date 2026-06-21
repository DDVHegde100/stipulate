import { randomBytes } from 'node:crypto';

import type { IssuingProcessor } from './types.js';

/** Marqeta processor stub — returns synthetic external IDs until live API keys are wired. */
export const marqetaProcessor: IssuingProcessor = {
  kind: 'marqeta',
  async createCardholder(input) {
    void input;
    void process.env.MARQETA_APPLICATION_TOKEN;
    return {
      externalId: `mq_user_${randomBytes(6).toString('hex')}`,
      mode: 'marqeta',
    };
  },
  async issueVirtualCard(input) {
    void input;
    const now = new Date();
    return {
      externalId: `mq_card_${randomBytes(6).toString('hex')}`,
      last4: String(Math.floor(1000 + Math.random() * 9000)),
      network: 'visa',
      expMonth: now.getUTCMonth() + 1,
      expYear: now.getUTCFullYear() + 3,
      panToken: `mq_tok_${randomBytes(8).toString('hex')}`,
      mode: 'marqeta',
    };
  },
};
