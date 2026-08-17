import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDb } from './packages/db/dist/index.js';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is required to run migrations');
}

const db = createDb(url);
await migrate(db, { migrationsFolder: './packages/db/migrations' });
console.log('Migrations applied');
process.exit(0);
