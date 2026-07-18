#!/usr/bin/env node
/**
 * Applies db/schema.sql to the database at process.env.DATABASE_URL.
 *
 * Uses the raw `pg` driver directly (no ORM/migration framework) since
 * db/schema.sql is already hand-written, idempotent SQL (CREATE TABLE IF
 * NOT EXISTS / CREATE INDEX IF NOT EXISTS / DROP POLICY IF EXISTS + CREATE
 * POLICY). Safe to re-run against an already-migrated database.
 *
 * Usage: DATABASE_URL=postgres://... node scripts/db/migrate.js
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set. Aborting migration.');
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, '..', '..', 'db', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log(`[db:migrate] Applying ${schemaPath} ...`);
    await client.query(schemaSql);
    console.log('[db:migrate] Schema applied successfully.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[db:migrate] Migration failed:', error);
  process.exit(1);
});
