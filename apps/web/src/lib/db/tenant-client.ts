/**
 * NCHQ Module 9: Tenant-Scoped Database Client Wrapper
 * Enforces SET LOCAL nextcase.active_tenant_id context guards.
 */

import { headers } from 'next/headers';

// Placeholder for a real DB client (e.g., Prisma or pg-promise)
const db = {
  $executeRaw: async (query: TemplateStringsArray, ...values: any[]) => {
    // Simulated safe execution using tagged templates to prevent injection
    console.log(`[DB_CLIENT] Safely Executing: ${query.join('?')}`);
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
  // Tagged template prevents SQL injection.
  await db.$executeRaw`SET LOCAL nextcase.active_tenant_id = ${tenantId}`;

  // 2. Execute the actual operation
  return operation(db);
}
