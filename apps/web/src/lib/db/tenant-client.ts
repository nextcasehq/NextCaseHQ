/**
 * NCHQ Module 9: Tenant-Scoped Database Client Wrapper
 * Enforces SET LOCAL nextcase.active_tenant_id context guards.
 */

import { headers } from 'next/headers';

// Placeholder for a real DB client (e.g., Prisma or pg-promise)
const db = {
  $executeRawUnsafe: async (query: string) => {
    console.log(`[DB_CLIENT] Executing: ${query}`);
    return true;
  },
  query: async (sql: string, params: any[]) => {
    console.log(`[DB_CLIENT] Executing Query: ${sql} with params: ${params}`);
    return [];
  }
};

/**
 * Wraps a database transaction to ensure RLS context is set.
 */
export async function withTenantContext<T>(
  operation: (client: typeof db) => Promise<T>
): Promise<T> {
  const headerList = await headers();
  const tenantId = headerList.get('x-nextcase-tenant-id');

  if (!tenantId) {
    throw new Error('SECURE_ACCESS_DENIED: Database query fired without a validated tenant context header.');
  }

  // 1. Initialize PostgreSQL session transaction with local state rule
  // In a real implementation, this would be part of a client.$transaction block.
  await db.$executeRawUnsafe(`SET LOCAL nextcase.active_tenant_id = '${tenantId}'`);

  // 2. Execute the actual operation
  return operation(db);
}
