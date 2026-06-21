import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import type { AppBindings } from '../../app.js';
import { exportOrgData, scheduleOrgDeletion, cancelOrgDeletion, getOrgDeletionStatus } from '../../services/org-gdpr.service.js';
import { listAuditEvents } from '../../repositories/audit.repository.js';

export const orgHandler = new Hono<AppBindings>();

orgHandler.get('/audit', async (c) => {
  const orgId = c.get('orgId');
  if (!orgId) throw new HTTPException(403, { message: 'Org context required' });

  const limit = Math.min(parseInt(c.req.query('limit') ?? '50', 10), 100);
  const events = await listAuditEvents(orgId, limit);
  return c.json({ data: { events }, requestId: c.get('requestId') });
});

orgHandler.get('/export', async (c) => {
  const orgId = c.get('orgId');
  if (!orgId) throw new HTTPException(403, { message: 'Org context required' });

  const bundle = await exportOrgData(orgId);
  return c.json({ data: bundle, requestId: c.get('requestId') });
});

orgHandler.delete('/', async (c) => {
  const orgId = c.get('orgId');
  if (!orgId) throw new HTTPException(403, { message: 'Org context required' });

  const result = await scheduleOrgDeletion(orgId);
  return c.json(
    {
      data: {
        status: 'scheduled',
        scheduledFor: result.scheduledFor,
        message: 'Organization deletion scheduled. Data will be purged after the grace period.',
      },
      requestId: c.get('requestId'),
    },
    202,
  );
});

orgHandler.post('/delete/cancel', async (c) => {
  const orgId = c.get('orgId');
  if (!orgId) throw new HTTPException(403, { message: 'Org context required' });

  const result = await cancelOrgDeletion(orgId);
  if (!result.cancelled) {
    throw new HTTPException(404, { message: 'No scheduled deletion found' });
  }

  return c.json({
    data: { status: 'cancelled', message: 'Organization deletion cancelled.' },
    requestId: c.get('requestId'),
  });
});

orgHandler.get('/delete', async (c) => {
  const orgId = c.get('orgId');
  if (!orgId) throw new HTTPException(403, { message: 'Org context required' });

  const status = await getOrgDeletionStatus(orgId);
  return c.json({ data: status, requestId: c.get('requestId') });
});
