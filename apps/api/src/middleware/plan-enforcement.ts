import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { AppBindings } from '../app.js';
import { checkPlanLimits } from '../services/metering.service.js';

/** Block requests when org exceeds monthly plan quota. */
export const planEnforcement = createMiddleware<AppBindings>(async (c, next) => {
  const orgId = c.get('orgId');
  const plan = c.get('orgPlan') ?? 'free';

  if (process.env.NODE_ENV === 'test' || !orgId) {
    await next();
    return;
  }

  const check = await checkPlanLimits(orgId, plan);
  if (!check.allowed) {
    throw new HTTPException(402, { message: check.reason ?? 'Plan limit exceeded' });
  }

  await next();
});
