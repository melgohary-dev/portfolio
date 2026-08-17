import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

export type Database = ReturnType<typeof createDb>;

/**
 * Single source of truth for the local/dev Postgres URL. Every consumer
 * (API boot, auth/billing singletons, seed, drizzle config) imports this
 * instead of copy-pasting the string, so the default cannot diverge.
 */
export function defaultDatabaseUrl(): string {
  return process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/saas_starter';
}

export function createDb(url: string): ReturnType<typeof drizzle<typeof schema>> {
  const pool = new Pool({ connectionString: url });
  return drizzle(pool, { schema });
}

export function db(pool: Pool): ReturnType<typeof drizzle<typeof schema>> {
  return drizzle(pool, { schema });
}

let cachedDb: Database | undefined;

/**
 * Process-wide singleton database handle (single pg pool). The auth and billing
 * packages used to each cache their own `createDb(...)` — two pools per process
 * — so they now share this one.
 */
export function getDatabase(url: string = defaultDatabaseUrl()): Database {
  cachedDb ??= createDb(url);
  return cachedDb;
}
