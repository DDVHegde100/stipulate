import { Hono } from 'hono';

import type { AppBindings } from '../../app.js';
import { adminAuth } from '../../middleware/admin-auth.js';
import { ingestionHandler } from './ingestion.js';

import { correctionsHandler } from './corrections.js';
import { orgsHandler } from './orgs.js';
import { reparseHandler } from './reparse.js';

export const adminRoutes = new Hono<AppBindings>();

adminRoutes.use('*', adminAuth);
adminRoutes.route('/ingestion', ingestionHandler);
adminRoutes.route('/corrections', correctionsHandler);
adminRoutes.route('/orgs', orgsHandler);
adminRoutes.route('/reparse', reparseHandler);

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
      corrections: {
        list: 'GET /admin/corrections',
        approve: 'POST /admin/corrections/:id/approve',
        reject: 'POST /admin/corrections/:id/reject',
      },
      orgs: {
        create: 'POST /admin/orgs',
        get: 'GET /admin/orgs/:slug',
        createKey: 'POST /admin/orgs/:slug/keys',
        listKeys: 'GET /admin/orgs/:slug/keys',
      },
    },
  });
});
