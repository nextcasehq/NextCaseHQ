/**
 * Multi-Tenant Database Client with RLS enforcement.
 */
export class DatabaseClient {
  private static dataStore: Map<string, any[]> = new Map();

  /**
   * Simulated execute function with SET LOCAL nextcase.current_tenant_id enforcement.
   */
  public async execute(tenantId: string, sql: string, params: any[]): Promise<any[]> {
    console.log(`[DB] EXECUTING: SET LOCAL nextcase.current_tenant_id = '${tenantId}'`);

    // RLS Enforcement Simulation
    if (sql.includes('SELECT') || sql.includes('UPDATE') || sql.includes('DELETE')) {
      return this.rlsFilter(tenantId, sql, params);
    }

    if (sql.includes('INSERT')) {
      const table = sql.split(' ')[2];
      const rows = DatabaseClient.dataStore.get(table) || [];
      const newRow = { ...params[0], tenant_id: tenantId };
      rows.push(newRow);
      DatabaseClient.dataStore.set(table, rows);
      return [newRow];
    }

    return [];
  }

  private rlsFilter(tenantId: string, sql: string, params: any[]): any[] {
    const table = sql.split(' ')[sql.split(' ').indexOf('FROM') + 1] || sql.split(' ')[1];
    const rows = DatabaseClient.dataStore.get(table) || [];

    // CRITICAL: The Postgres RLS policy equivalent
    // SELECT * FROM table WHERE tenant_id = current_setting('nextcase.current_tenant_id')
    const filtered = rows.filter(row => row.tenant_id === tenantId);

    console.log(`[DB] RLS Applied for tenant ${tenantId}. Accessible rows: ${filtered.length}/${rows.length}`);
    return filtered;
  }
}
