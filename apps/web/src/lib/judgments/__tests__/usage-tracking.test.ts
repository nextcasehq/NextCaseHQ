import { InMemoryUsageTracker, getUsageTracker, __setUsageTrackerForTests } from '../usage-tracking';

describe('Judgment Research usage tracking', () => {
  test('records an event with the fields needed to audit who searched for what, via which provider', async () => {
    const tracker = new InMemoryUsageTracker();
    await tracker.record({
      id: 'evt-1',
      tenantId: 't1',
      userId: 'u1',
      providerId: 'placeholder',
      query: 'ABC vs State of Kerala',
      resultStatus: 'unavailable',
      createdAt: new Date().toISOString(),
    });
    expect(tracker.getAll()).toHaveLength(1);
    expect(tracker.getAll()[0].providerId).toBe('placeholder');
  });

  test('is purely observational — no billing/credit fields exist on the event, no commercial logic implemented', async () => {
    const tracker = new InMemoryUsageTracker();
    await tracker.record({
      id: 'evt-2', tenantId: 't1', userId: 'u1', providerId: 'placeholder',
      query: 'q', resultStatus: 'unavailable', createdAt: new Date().toISOString(),
    });
    const event = tracker.getAll()[0] as Record<string, unknown>;
    expect(event).not.toHaveProperty('creditsCharged');
    expect(event).not.toHaveProperty('amount');
    expect(event).not.toHaveProperty('invoiceId');
  });

  test('getUsageTracker() returns a swappable singleton for tests', () => {
    const custom = new InMemoryUsageTracker();
    __setUsageTrackerForTests(custom);
    expect(getUsageTracker()).toBe(custom);
    __setUsageTrackerForTests(new InMemoryUsageTracker());
  });
});
