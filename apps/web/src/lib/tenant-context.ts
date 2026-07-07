import { cache } from 'react';

/**
 * Enforces the presence of a tenant context ID.
 * Securely fails with an exception if tenant context ID is omitted.
 */
export const getActiveTenantId = cache((): string => {
  // In a real implementation, this would pull from headers, cookies, or session.
  // For Phase 1, we simulate the check against a hypothetical session parameter.

  // Simulated session parameter check
  const activeTenantId = process.env.NEXT_PUBLIC_SIMULATED_TENANT_ID;

  if (!activeTenantId) {
    throw new Error("SECURE_ACCESS_DENIED: Tenant context ID is missing. Multi-tenant boundary check failed.");
  }

  return activeTenantId;
});

/**
 * Simulated database query runner with a 50ms performance budget.
 */
export async function executeSecureQuery<T>(queryName: string, queryFn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  const result = await queryFn();
  const end = performance.now();
  const duration = end - start;

  if (duration > 50) {
    console.warn(`PERFORMANCE_BUDGET_EXCEEDED: Query "${queryName}" took ${duration.toFixed(2)}ms`);
  }

  return result;
}
