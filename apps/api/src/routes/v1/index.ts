import { Hono } from 'hono';

import type { AppBindings } from '../../app.js';
import { orgAuth } from '../../middleware/org-auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { planEnforcement } from '../../middleware/plan-enforcement.js';
import { enrichHandler } from './enrich.js';
import { routeHandler } from './route.js';
import { cardsHandler } from './cards.js';
import { changelogHandler } from './changelog.js';
import { openapiHandler } from './openapi.js';
import { webhooksHandler } from './webhooks.js';
import { usageHandler } from './usage.js';

export const v1Routes = new Hono<AppBindings>();

v1Routes.use('*', orgAuth);
v1Routes.use('*', rateLimit);
v1Routes.use('*', planEnforcement);

v1Routes.route('/route', routeHandler);
v1Routes.route('/enrich', enrichHandler);
v1Routes.route('/cards', cardsHandler);
v1Routes.route('/changelog', changelogHandler);
v1Routes.route('/openapi', openapiHandler);
v1Routes.route('/webhooks', webhooksHandler);
v1Routes.route('/usage', usageHandler);

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
        path: '/v1/cards/{card_id}/benefits',
        description: 'Versioned benefit rules for a card (supports ?as_of= and ?version=)',
      },
      changelog: {
        method: 'GET',
        path: '/v1/changelog',
        description: 'Benefit change history across the catalog',
      },
    },
  });
});
