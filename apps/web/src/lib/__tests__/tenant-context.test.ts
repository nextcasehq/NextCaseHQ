import { getActiveTenantId, executeSecureQuery } from '../tenant-context';
import { headers } from 'next/headers';

jest.mock('next/headers', () => ({
  headers: jest.fn(),
}));

describe('Tenant Context & Performance Budget', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('getActiveTenantId should throw if tenant ID is missing', async () => {
    (headers as jest.Mock).mockResolvedValue(new Map());
    await expect(getActiveTenantId()).rejects.toThrow("SECURE_ACCESS_DENIED");
  });

  test('getActiveTenantId should return tenant ID if present and valid UUID', async () => {
    const validUuid = '00000000-0000-4000-8000-000000000001';
    const mockHeaders = new Map([['x-nextcase-tenant-id', validUuid]]);
    (headers as jest.Mock).mockResolvedValue(mockHeaders);

    expect(await getActiveTenantId()).toBe(validUuid);
  });

  test('getActiveTenantId should throw if tenant ID is invalid format', async () => {
    const mockHeaders = new Map([['x-nextcase-tenant-id', 'invalid-uuid']]);
    (headers as jest.Mock).mockResolvedValue(mockHeaders);

    await expect(getActiveTenantId()).rejects.toThrow("Invalid tenant context format");
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
