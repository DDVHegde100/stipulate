#!/usr/bin/env tsx
/** Bootstrap a dev org with API key. Usage: pnpm --filter @stipulate/api bootstrap:org */
import { createOrgWithApiKey } from '../src/repositories/org.repository.js';
import { disconnectDatabase } from '../src/lib/db.js';

async function main(): Promise<void> {
  const slug = process.argv[2] ?? 'stipulate-dev';
  const name = process.argv[3] ?? 'Stipulate Development';
  const plan = process.argv[4] ?? 'saas';

  const result = await createOrgWithApiKey({
    slug,
    name,
    plan,
    scopes: ['route:read', 'enrich:read', 'webhooks:write', '*'],
  });

  console.log(JSON.stringify({
    org: { slug: result.org.slug, plan: result.org.plan },
    apiKey: result.rawKey,
    prefix: result.prefix,
  }, null, 2));

  await disconnectDatabase();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
