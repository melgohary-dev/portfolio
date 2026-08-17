import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDb } from '@saas/db';

// Production entrypoint (see Dockerfile): fail fast instead of silently
// migrating a test/other database when the variable is missing.
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is required to run migrations');
}
const migrationsFolder = fileURLToPath(
  new URL('../../../packages/db/migrations', import.meta.url),
);

await migrate(createDb(url), { migrationsFolder });
console.log('Migrations applied');
