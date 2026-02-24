import { serve } from '@hono/node-server';

import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { connectRedis, disconnectRedis } from './lib/redis.js';
import { disconnectDatabase } from './lib/db.js';
import { logFatal, logShutdown, logStartup, logger } from './lib/logger.js';
import { prewarmRoutingCache } from './cache/prewarm.js';
import { trackEvent } from './lib/observability.js';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = createApp();
  const port = env.PORT;

  await Promise.allSettled([connectRedis()]);

  void trackEvent('api.startup', { port, env: env.NODE_ENV });

  if (env.NODE_ENV !== 'test') {
    prewarmRoutingCache()
      .then((manifest) => {
        logger.info({ warmedAt: manifest.warmedAt, keys: manifest.cardBundleKeys.length }, 'Routing cache prewarmed');
      })
      .catch((err) => {
        logger.warn({ err }, 'Routing cache prewarm skipped');
      });
  }

  const server = serve(
    {
      fetch: app.fetch,
      port,
    },
    (info) => {
      logStartup(info.port);
    },
  );

  const shutdown = async (signal: string) => {
    logShutdown(signal);

    await Promise.allSettled([disconnectRedis(), disconnectDatabase()]);

    server.close((error) => {
      if (error) {
        logFatal(error);
        process.exit(1);
      }

      logger.info('HTTP server closed gracefully');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

bootstrap().catch((error) => {
  logFatal(error);
  process.exit(1);
});
