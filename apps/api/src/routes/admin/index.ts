import { Hono } from 'hono';

import type { AppBindings } from '../../app.js';
import { adminAuth } from '../../middleware/admin-auth.js';
import { ingestionHandler } from './ingestion.js';

export const adminRoutes = new Hono<AppBindings>();

adminRoutes.use('*', adminAuth);
adminRoutes.route('/ingestion', ingestionHandler);

adminRoutes.get('/', (c) => {
  return c.json({
    name: 'Stipulate Admin API',
    endpoints: {
      ingestion: {
        createJob: 'POST /admin/ingestion/jobs',
        listJobs: 'GET /admin/ingestion/jobs',
        getJob: 'GET /admin/ingestion/jobs/:id',
        reviewJob: 'POST /admin/ingestion/jobs/:id/review',
        queue: 'GET /admin/ingestion/queue',
      },
    },
  });
});
