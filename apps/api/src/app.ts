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
import { v1Routes } from './routes/v1/index.js';
import { adminRoutes } from './routes/admin/index.js';
import type { RoutingService } from './services/routing.service.js';
import { routingService as defaultRoutingService } from './services/routing.service.js';

export type AppVariables = {
  requestId: string;
  authenticated: boolean;
};

export type AppBindings = {
  Variables: AppVariables;
};

export interface CreateAppOptions {
  routingService?: RoutingService;
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
      origin: env.CORS_ORIGINS.includes('*') ? '*' : env.CORS_ORIGINS,
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-Id'],
      exposeHeaders: ['X-Request-Id', 'X-Response-Time'],
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

  if (options.routingService) {
    // Reserved for dependency injection in tests; routes use module singleton today.
    void options.routingService;
  } else {
    void defaultRoutingService;
  }

  return app;
}

export type App = ReturnType<typeof createApp>;
