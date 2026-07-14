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

  test('getActiveTenantId should return tenant ID if present and valid UUID', () => {
    const validUuid = '00000000-0000-4000-8000-000000000001';
    process.env.NEXT_PUBLIC_SIMULATED_TENANT_ID = validUuid;
    expect(getActiveTenantId()).toBe(validUuid);
  });

  test('getActiveTenantId should throw if tenant ID is invalid format', () => {
    process.env.NEXT_PUBLIC_SIMULATED_TENANT_ID = 'invalid-uuid';
    expect(() => getActiveTenantId()).toThrow("Invalid tenant context format");
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
