import { Hono } from 'hono';

import type { AppBindings } from '../../app.js';
import { orgAuth } from '../../middleware/org-auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { planEnforcement } from '../../middleware/plan-enforcement.js';
import { metrics } from '../../middleware/metrics.js';
import { enrichHandler } from './enrich.js';
import { routeHandler } from './route.js';
import { cardsHandler } from './cards.js';
import { changelogHandler } from './changelog.js';
import { openapiHandler } from './openapi.js';
import { webhooksHandler } from './webhooks.js';
import { usageHandler } from './usage.js';
import { valuationsHandler } from './valuations.js';
import { billingHandler } from './billing.js';
import { proxyPayHandler } from './proxy-pay.js';
import { keysHandler } from './keys.js';
import { spendHandler } from './spend.js';
import { orgHandler } from './org.js';
import { walletHandler } from './wallet.js';
import { plaidHandler } from './plaid.js';

export const v1Routes = new Hono<AppBindings>();

v1Routes.use('*', orgAuth);
v1Routes.use('*', rateLimit);
v1Routes.use('*', planEnforcement);
v1Routes.use('*', metrics);

v1Routes.route('/route', routeHandler);
v1Routes.route('/enrich', enrichHandler);
v1Routes.route('/cards', cardsHandler);
v1Routes.route('/changelog', changelogHandler);
v1Routes.route('/openapi', openapiHandler);
v1Routes.route('/webhooks', webhooksHandler);
v1Routes.route('/usage', usageHandler);
v1Routes.route('/valuations', valuationsHandler);
v1Routes.route('/billing', billingHandler);
v1Routes.route('/proxy-pay', proxyPayHandler);
v1Routes.route('/keys', keysHandler);
v1Routes.route('/spend', spendHandler);
v1Routes.route('/org', orgHandler);
v1Routes.route('/wallet', walletHandler);
v1Routes.route('/plaid', plaidHandler);

v1Routes.get('/', (c) => {
  return c.json({
    version: 'v1',
    endpoints: {
      route: {
        method: 'POST',
        path: '/v1/route',
        description: 'Recommend the optimal card for a transaction',
      },
      routeBatch: {
        method: 'POST',
        path: '/v1/route/batch',
        description: 'Batch rank cards for up to 100 transactions',
      },
      enrich: {
        method: 'POST',
        path: '/v1/enrich',
        description: 'Normalize merchant metadata for benefit matching',
      },
      enrichCorrections: {
        method: 'POST',
        path: '/v1/enrich/corrections',
        description: 'Submit crowd-sourced MCC corrections',
      },
      webhooks: {
        method: 'POST',
        path: '/v1/webhooks',
        description: 'Subscribe to benefit change webhooks',
      },
      openapi: {
        method: 'GET',
        path: '/v1/openapi',
        description: 'OpenAPI 3.1 specification',
      },
      cards: {
        method: 'GET',
        path: '/v1/cards',
        description: 'Search and list cards in the catalog',
      },
      cardBenefits: {
        method: 'GET',
        path: '/v1/cards/{card_id}/benefits',
        description: 'Versioned benefit rules for a card (supports ?as_of= and ?version=)',
      },
      valuations: {
        method: 'GET',
        path: '/v1/valuations',
        description: 'Points program valuations and org overrides',
      },
      changelog: {
        method: 'GET',
        path: '/v1/changelog',
        description: 'Benefit change history across the catalog',
      },
      walletCategoryState: {
        method: 'POST',
        path: '/v1/wallet/category-state',
        description: 'Set rotating or custom-cash top category for a card',
      },
      walletCards: {
        method: 'GET',
        path: '/v1/wallet/cards',
        description: 'List server-backed wallet cards for a consumer user',
      },
      plaidLinkToken: {
        method: 'POST',
        path: '/v1/plaid/link-token',
        description: 'Create a Plaid Link token for bank connection',
      },
      spendTrack: {
        method: 'POST',
        path: '/v1/spend/track',
        description: 'Record category spend for cap tracking',
      },
      spendCaps: {
        method: 'GET',
        path: '/v1/spend/caps',
        description: 'Cap utilization and remaining headroom by card',
      },
    },
  });
});
