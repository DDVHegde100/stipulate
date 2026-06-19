import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { Hono } from 'hono';
import type { AppBindings } from '../../app.js';

const OPENAPI_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/openapi.yaml',
);

function loadOpenApiSpec(): Record<string, unknown> {
  const spec = readFileSync(OPENAPI_PATH, 'utf-8');
  return parseYaml(spec) as Record<string, unknown>;
}

export const openapiHandler = new Hono<AppBindings>();

openapiHandler.get('/', (c) => {
  const spec = readFileSync(OPENAPI_PATH, 'utf-8');
  return c.text(spec, 200, { 'Content-Type': 'application/yaml' });
});

openapiHandler.get('/json', (c) => {
  return c.json(loadOpenApiSpec());
});
