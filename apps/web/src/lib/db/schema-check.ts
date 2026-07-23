import { Pool } from 'pg';

/**
 * Fails fast at startup if the connected database is missing a table this
 * build's code depends on — the exact failure mode a shipped feature hits
 * when `db/schema.sql` was never (re-)applied to an environment's database
 * after the feature merged (see scripts/db/migrate.js; there is no
 * automated migration-on-deploy step, so this is a manual, easy-to-miss
 * action). Without this check, a missing table doesn't surface until the
 * first real request touches it, as a generic per-request 500 — this
 * turns that into a loud, immediate startup failure instead, matching
 * env-validation.ts's existing "fail fast in production" philosophy.
 *
 * Deliberately just the tables backing features already known to have
 * shipped code ahead of a database migration in this project's history
 * (see docs/PENDING_INTEGRATION_REGISTER.md's DB-1/DB-2 provisioning
 * notes) — not a general schema-drift diff against the full schema.sql,
 * which would be a much larger, separate undertaking.
 */
const REQUIRED_TABLES = ['DocumentDraft'] as const;

export async function collectMissingTables(connectionString: string | undefined): Promise<string[]> {
  if (!connectionString) return [];

  const pool = new Pool({ connectionString, max: 1 });
  try {
    const result = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1)`,
      [REQUIRED_TABLES]
    );
    const present = new Set(result.rows.map((row) => row.table_name));
    return REQUIRED_TABLES.filter((table) => !present.has(table));
  } finally {
    await pool.end();
  }
}

export async function validateStartupSchema(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  if (env.NODE_ENV !== 'production') return;

  const missing = await collectMissingTables(env.DATABASE_URL);
  if (missing.length > 0) {
    throw new Error(
      `Startup schema validation failed: the database is missing required table(s): ${missing.join(', ')}. ` +
        `Run 'MIGRATION_DATABASE_URL=<admin-connection-string> node scripts/db/migrate.js' against this environment's database to apply db/schema.sql.`
    );
  }
}
