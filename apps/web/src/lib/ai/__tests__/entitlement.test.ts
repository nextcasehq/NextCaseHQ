import { enforceEntitlement } from '../entitlement';
import { AI_OPERATION_TYPES } from '../operation-types';

describe('enforceEntitlement', () => {
  const TENANT_ID = '00000000-0000-4000-8000-000000000be1';
  const USER_ID = '00000000-0000-4000-8000-000000000be2';

  test('always allows today, for every frozen operation type', async () => {
    for (const operationType of AI_OPERATION_TYPES) {
      const result = await enforceEntitlement(TENANT_ID, USER_ID, operationType);
      expect(result).toEqual({ allowed: true });
    }
  });

  test('returns a plain EntitlementResult shape with no reason when allowed', async () => {
    const result = await enforceEntitlement(TENANT_ID, USER_ID, 'AI_CHAT');
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  test('is a pure function of its inputs — does not throw regardless of tenant/user values', async () => {
    await expect(enforceEntitlement('not-a-real-tenant', 'not-a-real-user', 'AI_CHAT')).resolves.toEqual({
      allowed: true,
    });
  });
});
