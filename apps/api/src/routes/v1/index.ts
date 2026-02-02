import { Hono } from 'hono';

import type { AppBindings } from '../../app.js';
import { auth } from '../../middleware/auth.js';
import { enrichHandler } from './enrich.js';
import { routeHandler } from './route.js';

export const v1Routes = new Hono<AppBindings>();

v1Routes.use('*', auth);

v1Routes.route('/route', routeHandler);
v1Routes.route('/enrich', enrichHandler);

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
    },
  });
});
