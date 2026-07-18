import { Pool, type QueryResultRow } from 'pg';

/**
 * Multi-Tenant Database Client with RLS enforcement.
 *
 * Every query runs inside a transaction that first binds
 * `nextcase.current_tenant_id` via set_config(..., true) — the parameterized
 * equivalent of `SET LOCAL` — so Postgres RLS policies (see db/schema.sql)
 * scope every statement to the calling tenant for the lifetime of that
 * transaction only.
 */

const TENANT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let pool: Pool | undefined;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL is not set. A PostgreSQL connection string is required to reach the database.'
      );
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

/**
 * Closes the shared connection pool. Intended for test teardown and
 * graceful process shutdown — not needed during normal request handling.
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

export class DatabaseClient {
  public async execute<T extends QueryResultRow = any>(
    tenantId: string,
    sql: string,
    params: any[] = []
  ): Promise<T[]> {
    if (!TENANT_ID_PATTERN.test(tenantId)) {
      throw new Error(`SECURE_ACCESS_DENIED: Invalid tenant context '${tenantId}'.`);
    }

    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      // set_config is injection-safe and transaction-scoped (is_local = true),
      // matching `SET LOCAL nextcase.current_tenant_id = <tenantId>` without
      // string-interpolating an identifier into the SQL text.
      await client.query(`SELECT set_config('nextcase.current_tenant_id', $1, true)`, [tenantId]);
      const result = await client.query<T>(sql, params);
      await client.query('COMMIT');
      return result.rows;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
