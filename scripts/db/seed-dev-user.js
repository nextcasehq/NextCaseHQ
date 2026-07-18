#!/usr/bin/env node
/**
 * Idempotently creates/updates a development login user, reading the
 * password from an environment variable so nothing is committed. Uses
 * DATABASE_URL (the least-privilege `nextcase_app` role) since this is
 * just an INSERT/UPDATE the app role already has grants for — no admin
 * connection needed.
 *
 * Usage:
 *   DATABASE_URL=postgres://nextcase_app:...@localhost:5432/nextcase_dev \
 *   DEV_SEED_USER_PASSWORD=<your-own-local-password> \
 *   node scripts/db/seed-dev-user.js
 *
 * Optional: DEV_SEED_USER_EMAIL (default dev@nextcase.local),
 *           DEV_SEED_TENANT_ID (default the seed.sql default tenant).
 */
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const DEFAULT_EMAIL = 'dev@nextcase.local';
const SALT_ROUNDS = 12;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set. Aborting.');
    process.exit(1);
  }

  const password = process.env.DEV_SEED_USER_PASSWORD;
  if (!password) {
    console.error(
      'DEV_SEED_USER_PASSWORD is not set. Refusing to create a dev user with no password ' +
        '(and refusing to default one, since that would be a committed credential).'
    );
    process.exit(1);
  }

  const email = (process.env.DEV_SEED_USER_EMAIL || DEFAULT_EMAIL).toLowerCase();
  const tenantId = process.env.DEV_SEED_TENANT_ID || DEFAULT_TENANT_ID;
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const client = new Client({ connectionString });
  await client.connect();
  try {
    const result = await client.query(
      `INSERT INTO "User" (tenant_id, email, name, password_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = now()
       RETURNING id, tenant_id, email`,
      [tenantId, email, 'Dev Seed User', passwordHash]
    );
    console.log(`[seed-dev-user] Ready: ${result.rows[0].email} (tenant ${result.rows[0].tenant_id}).`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[seed-dev-user] Failed:', error);
  process.exit(1);
});
