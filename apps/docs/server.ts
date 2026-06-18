import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const app = new Hono();

app.get('/', (c) => {
  const html = readFileSync(join(root, 'public', 'index.html'), 'utf-8');
  return c.html(html);
});

app.get('/health', (c) => c.json({ status: 'ok', service: '@stipulate/docs' }));

const port = parseInt(process.env.DOCS_PORT ?? '3002', 10);

serve({ fetch: app.fetch, port }, () => {
  console.log(`Stipulate docs running at http://localhost:${port}`);
});
