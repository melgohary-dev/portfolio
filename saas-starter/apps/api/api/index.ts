import { handle } from 'hono/vercel';
import { createDb, defaultDatabaseUrl } from '@saas/db';
import { createApp } from '../src/index.js';

const db = createDb(defaultDatabaseUrl());
const app = createApp(db);

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);
export const HEAD = handle(app);