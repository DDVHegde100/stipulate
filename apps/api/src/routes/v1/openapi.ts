import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Hono } from 'hono';
import type { AppBindings } from '../../app.js';

const OPENAPI_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../docs/openapi.yaml',
);

export const openapiHandler = new Hono<AppBindings>();

openapiHandler.get('/', (c) => {
  const spec = readFileSync(OPENAPI_PATH, 'utf-8');
  return c.text(spec, 200, { 'Content-Type': 'application/yaml' });
});

openapiHandler.get('/json', (c) => {
  return c.json({
    openapi: '3.1.0',
    info: {
      title: 'Stipulate Card Benefit Intelligence API',
      version: '1.0.0',
    },
    paths: {
      '/v1/route': { post: { summary: 'Rank cards for a purchase' } },
      '/v1/enrich': { post: { summary: 'Resolve merchant MCC and category' } },
      '/v1/enrich/corrections': { post: { summary: 'Submit MCC correction' } },
    },
  });
});
