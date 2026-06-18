import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const app = new Hono();

const openapiUrl =
  process.env.DOCS_OPENAPI_URL ??
  `${(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1').replace(/\/v1$/, '')}/v1/openapi`;

app.get('/', (c) => {
  const html = readFileSync(join(root, 'public', 'index.html'), 'utf-8').replace(
    '__OPENAPI_URL__',
    openapiUrl,
  );
  return c.html(html);
});

app.get('/health', (c) => c.json({ status: 'ok', service: '@stipulate/docs', openapiUrl }));

const port = parseInt(process.env.DOCS_PORT ?? '3002', 10);

serve({ fetch: app.fetch, port }, () => {
  console.log(`Stipulate docs running at http://localhost:${port}`);
});
