import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { logger as honoLogger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';

import { loadEnv } from './config/env.js';
import { createChildLogger } from './lib/logger.js';
import { requestId } from './middleware/request-id.js';
import { timing } from './middleware/timing.js';
import { healthRoutes } from './routes/health.js';
import { statusRoutes } from './routes/status.js';
import { v1Routes } from './routes/v1/index.js';
import { adminRoutes } from './routes/admin/index.js';
import { stripeWebhookHandler } from './routes/webhooks/stripe.js';
import { waitlistHandler } from './routes/public/waitlist.js';
import { consumerAuthHandler } from './routes/public/auth.js';
import { captureException } from './lib/observability.js';

export type AppVariables = {
  requestId: string;
  authenticated: boolean;
  orgId?: string;
  orgPlan?: string;
  apiKeyId?: string;
  scopes?: string[];
  rateLimitPerMinute?: number;
};

export type AppBindings = {
  Variables: AppVariables;
};

export interface CreateAppOptions {
  enablePrettyJson?: boolean;
}

const errorLog = createChildLogger({ component: 'error-handler' });

export function createApp(options: CreateAppOptions = {}): Hono<AppBindings> {
  const env = loadEnv();
  const app = new Hono<AppBindings>();

  app.use('*', requestId);
  app.use('*', timing);
  app.use('*', secureHeaders());
  app.use(
    '*',
    cors({
      origin: (origin) => {
        if (env.CORS_ORIGINS.includes('*')) return origin ?? '*';
        if (!origin) return env.CORS_ORIGINS[0] ?? '';
        return env.CORS_ORIGINS.includes(origin) ? origin : env.CORS_ORIGINS[0] ?? '';
      },
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: [
        'Content-Type',
        'Authorization',
        'X-API-Key',
        'X-Request-Id',
        'X-User-Id',
        'X-Consumer-User-Id',
        'X-User-Ref',
        'Cookie',
      ],
      exposeHeaders: ['X-Request-Id', 'X-Response-Time', 'Set-Cookie'],
      credentials: true,
      maxAge: 86_400,
    }),
  );

  if (env.NODE_ENV !== 'test') {
    app.use('*', honoLogger());
  }

  if (options.enablePrettyJson ?? env.NODE_ENV === 'development') {
    app.use('*', prettyJSON());
  }

  app.get('/', (c) => {
    return c.json({
      name: '@stipulate/api',
      description: 'Stipulate card benefit intelligence platform API',
      version: env.API_VERSION,
      docs: `/${env.API_VERSION}`,
      health: '/health',
    });
  });

  app.route('/health', healthRoutes);
  app.route('/status', statusRoutes);
  app.route('/webhooks/stripe', stripeWebhookHandler);
  app.route('/public/waitlist', waitlistHandler);
  app.route('/public/auth', consumerAuthHandler);
  app.route(`/${env.API_VERSION}`, v1Routes);
  app.route('/admin', adminRoutes);

  app.notFound((c) => {
    return c.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: `Route ${c.req.method} ${c.req.path} was not found`,
        },
        requestId: c.get('requestId'),
      },
      404,
    );
  });

  app.onError((error, c) => {
    const requestId = c.get('requestId');

    if (error instanceof HTTPException) {
      return c.json(
        {
          error: {
            code: 'HTTP_EXCEPTION',
            message: error.message,
          },
          requestId,
        },
        error.status,
      );
    }

    errorLog.error(
      {
        err: error,
        requestId,
        path: c.req.path,
        method: c.req.method,
      },
      'Unhandled application error',
    );

    void captureException(error, { requestId, path: c.req.path, method: c.req.method });

    return c.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message,
        },
        requestId,
      },
      500,
    );
  });

  return app;
}

export type App = ReturnType<typeof createApp>;
