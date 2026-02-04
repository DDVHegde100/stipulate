#!/usr/bin/env tsx
/**
 * Generates JSON Schema files from Zod definitions.
 * Usage: pnpm --filter @stipulate/schema generate:json-schema
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportAllJsonSchemas, toJsonSchema, SCHEMA_REGISTRY } from '../src/json-schema.js';
import type { SchemaName } from '../src/json-schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../json-schema');

mkdirSync(outDir, { recursive: true });

const index = exportAllJsonSchemas();
writeFileSync(join(outDir, 'index.json'), JSON.stringify(index, null, 2));

for (const name of Object.keys(SCHEMA_REGISTRY) as SchemaName[]) {
  const schema = toJsonSchema(name);
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify(schema, null, 2));
}

console.log(`Generated ${Object.keys(SCHEMA_REGISTRY).length + 1} JSON Schema files in ${outDir}`);
