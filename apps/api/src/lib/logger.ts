import pino, { type Logger, type LoggerOptions } from 'pino';

import { isDevelopment, isTest, loadEnv } from '../config/env.js';

const env = loadEnv();

const baseOptions: LoggerOptions = {
  level: env.LOG_LEVEL,
  base: {
    service: '@stipulate/api',
    version: env.API_VERSION,
    env: env.NODE_ENV,
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-api-key"]',
      'headers.authorization',
      'headers["x-api-key"]',
      '*.password',
      '*.apiKey',
      '*.api_key',
    ],
    remove: true,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

function createTransport() {
  if (isTest(env)) {
    return undefined;
  }

  if (isDevelopment(env)) {
    return pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: false,
      },
    });
  }

  return undefined;
}

export const logger: Logger = pino(baseOptions, createTransport());

export function createChildLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}

export type AppLogger = Logger;

export function logStartup(port: number): void {
  logger.info(
    {
      port,
      apiVersion: env.API_VERSION,
      nodeEnv: env.NODE_ENV,
    },
    'Stipulate API server started',
  );
}

export function logShutdown(signal: string): void {
  logger.info({ signal }, 'Received shutdown signal, draining connections');
}

export function logFatal(error: unknown): void {
  logger.fatal({ err: error }, 'Fatal error during startup or shutdown');
}
