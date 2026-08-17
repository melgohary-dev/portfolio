import pg from 'pg';

const { Client } = pg;
const dbName = process.env.TEST_DATABASE_NAME ?? 'saas_test_db';
const baseUrl = process.env.TEST_DATABASE_ADMIN_URL ?? 'postgres://postgres:postgres@localhost:5432/postgres';

const client = new Client({ connectionString: baseUrl });
await client.connect();
const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
if (res.rowCount === 0) {
  await client.query(`CREATE DATABASE ${dbName}`);
  console.log(`created ${dbName}`);
} else {
  console.log(`${dbName} already exists`);
}
await client.end();
