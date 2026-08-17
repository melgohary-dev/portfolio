import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
import { createDb } from '@saas/db';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/saas_test_db';

// Applies the schema to the test database before the suite runs (replaces the
// old `node scripts/migrate.mjs && vitest run` prefix, which read env vars the
// test process hadn't set yet). Note: env mutations here do NOT propagate to
// test workers — each test file still configures its own environment.
export default async function setup(): Promise<void> {
  await migrate(createDb(TEST_DATABASE_URL), {
    migrationsFolder: fileURLToPath(new URL('../../../packages/db/migrations', import.meta.url)),
  });
}
