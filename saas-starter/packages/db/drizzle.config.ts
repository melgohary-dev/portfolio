import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { defaultDatabaseUrl } from './src/client.js';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './migrations',
  dbCredentials: {
    url: defaultDatabaseUrl(),
  },
});
