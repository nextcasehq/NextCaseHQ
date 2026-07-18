import { POST } from '../route';
import { signWebhookPayload } from '@/lib/security/webhook-signature';
import { __resetForTests } from '@/lib/security/replay-guard';

function buildRequest(body: string, headers: Record<string, string>): Request {
  return new Request('http://localhost/api/webhooks', {
    method: 'POST',
    headers,
    body,
  });
}

async function buildSignedRequest(
  payload: unknown,
  options?: { timestamp?: number }
): Promise<Request> {
  const body = JSON.stringify(payload);
  const timestamp = options?.timestamp ?? Math.floor(Date.now() / 1000);
  const signature = await signWebhookPayload(body, timestamp);
  return buildRequest(body, {
    'x-nextcase-timestamp': String(timestamp),
    'x-nextcase-signature': signature,
  });
}

beforeEach(() => {
  __resetForTests();
});

describe('POST /api/webhooks — secure webhook verification', () => {
  const validPayload = { event_type: 'case.updated', payload: { id: '123' } };

  test('accepts a validly signed, fresh request', async () => {
    const req = await buildSignedRequest(validPayload);
    const res = await POST(req);
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.status).toBe('ACCEPTED');
    expect(body.event).toBe('case.updated');
  });

  test('rejects an unsigned request (no headers at all)', async () => {
    const req = buildRequest(JSON.stringify(validPayload), {});
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.reason).toBe('MISSING_HEADERS');
  });

  test('rejects a request with a timestamp but no signature', async () => {
    const req = buildRequest(JSON.stringify(validPayload), {
      'x-nextcase-timestamp': String(Math.floor(Date.now() / 1000)),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.reason).toBe('MISSING_HEADERS');
  });

  test('rejects a fabricated/invalid signature', async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const req = buildRequest(JSON.stringify(validPayload), {
      'x-nextcase-timestamp': String(timestamp),
      'x-nextcase-signature': 'sha256=' + '0'.repeat(64),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.reason).toBe('INVALID_SIGNATURE');
  });

  test('rejects a tampered body (valid signature computed for a different payload)', async () => {
    const originalBody = JSON.stringify(validPayload);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await signWebhookPayload(originalBody, timestamp);
    const tamperedBody = JSON.stringify({ ...validPayload, event_type: 'case.deleted' });
    const req = buildRequest(tamperedBody, {
      'x-nextcase-timestamp': String(timestamp),
      'x-nextcase-signature': signature,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.reason).toBe('INVALID_SIGNATURE');
  });

  test('rejects an expired timestamp even when correctly signed for it', async () => {
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes old; tolerance is 5
    const req = await buildSignedRequest(validPayload, { timestamp: oldTimestamp });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.reason).toBe('EXPIRED');
  });

  test('rejects a non-numeric timestamp', async () => {
    const req = buildRequest(JSON.stringify(validPayload), {
      'x-nextcase-timestamp': 'not-a-number',
      'x-nextcase-signature': 'sha256=irrelevant',
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.reason).toBe('INVALID_TIMESTAMP');
  });

  test('rejects a replayed request — the identical signed envelope sent twice', async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const req1 = await buildSignedRequest(validPayload, { timestamp });
    const res1 = await POST(req1);
    expect(res1.status).toBe(202);

    const req2 = await buildSignedRequest(validPayload, { timestamp });
    const res2 = await POST(req2);
    expect(res2.status).toBe(409);
    const body2 = await res2.json();
    expect(body2.error).toBe('REPLAYED_REQUEST');
  });

  test('rejects a malformed (non-JSON) payload even with a valid signature', async () => {
    const rawBody = 'not-json{{{';
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await signWebhookPayload(rawBody, timestamp);
    const req = buildRequest(rawBody, {
      'x-nextcase-timestamp': String(timestamp),
      'x-nextcase-signature': signature,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('rejects a validly signed payload that fails schema validation', async () => {
    const invalidShape = { not_event_type: 'x' };
    const req = await buildSignedRequest(invalidShape);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
