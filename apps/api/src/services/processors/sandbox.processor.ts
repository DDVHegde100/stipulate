import { randomBytes } from 'node:crypto';

import type { IssuingProcessor } from './types.js';

export const sandboxProcessor: IssuingProcessor = {
  kind: 'sandbox',
  async createCardholder() {
    return {
      externalId: `ext_${randomBytes(6).toString('hex')}`,
      mode: 'sandbox',
    };
  },
  async issueVirtualCard() {
    const now = new Date();
    return {
      externalId: `vc_${randomBytes(6).toString('hex')}`,
      last4: String(Math.floor(1000 + Math.random() * 9000)),
      network: 'visa',
      expMonth: now.getUTCMonth() + 1,
      expYear: now.getUTCFullYear() + 3,
      panToken: `pan_tok_${randomBytes(8).toString('hex')}`,
      mode: 'sandbox',
    };
  },
};
