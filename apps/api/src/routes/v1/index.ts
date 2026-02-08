import { Hono } from 'hono';

import type { AppBindings } from '../../app.js';
import { auth } from '../../middleware/auth.js';
import { enrichHandler } from './enrich.js';
import { routeHandler } from './route.js';
import { cardsHandler } from './cards.js';
import { changelogHandler } from './changelog.js';

export const v1Routes = new Hono<AppBindings>();

v1Routes.use('*', auth);

v1Routes.route('/route', routeHandler);
v1Routes.route('/enrich', enrichHandler);
v1Routes.route('/cards', cardsHandler);
v1Routes.route('/changelog', changelogHandler);

v1Routes.get('/', (c) => {
  return c.json({
    version: 'v1',
    endpoints: {
      route: {
        method: 'POST',
        path: '/v1/route',
        description: 'Recommend the optimal card for a transaction',
      },
      enrich: {
        method: 'POST',
        path: '/v1/enrich',
        description: 'Normalize merchant metadata for benefit matching',
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
