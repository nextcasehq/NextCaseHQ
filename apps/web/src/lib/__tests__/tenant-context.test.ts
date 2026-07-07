import { getActiveTenantId, executeSecureQuery } from '../tenant-context';

describe('Tenant Context & Performance Budget', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('getActiveTenantId should throw if tenant ID is missing', () => {
    delete process.env.NEXT_PUBLIC_SIMULATED_TENANT_ID;
    expect(() => getActiveTenantId()).toThrow("SECURE_ACCESS_DENIED");
  });

  test('getActiveTenantId should return tenant ID if present', () => {
    process.env.NEXT_PUBLIC_SIMULATED_TENANT_ID = 'test-tenant-id';
    expect(getActiveTenantId()).toBe('test-tenant-id');
  });

  test('executeSecureQuery should complete and log warning if budget exceeded', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    await executeSecureQuery('SlowQuery', async () => {
      await new Promise(resolve => setTimeout(resolve, 60));
      return true;
    });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('PERFORMANCE_BUDGET_EXCEEDED'));
    consoleSpy.mockRestore();
  });

  test('executeSecureQuery should complete without warning if under budget', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    await executeSecureQuery('FastQuery', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return true;
    });

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
