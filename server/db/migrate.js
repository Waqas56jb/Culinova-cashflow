// Runs db/schema.sql against the Supabase Postgres database.
// Usage: set DATABASE_URL in .env, then:  node db/migrate.js
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';

const { Client } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('\n  Missing DATABASE_URL in .env');
  console.error('  Get it from: Supabase -> Project Settings -> Database -> Connection string (URI)');
  console.error('  Example: postgresql://postgres.<ref>:<PASSWORD>@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres\n');
  process.exit(1);
}

const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log('  Connected. Running schema.sql …');
  await client.query(sql);
  const { rows } = await client.query(
    "select table_name from information_schema.tables where table_schema='public' order by table_name"
  );
  console.log('\n  ✓ Schema applied. Tables now in public schema:');
  rows.forEach((r) => console.log('    -', r.table_name));
  console.log('');
} catch (e) {
  console.error('  ✗ Migration failed:', e.message);
  process.exit(1);
} finally {
  await client.end();
}
