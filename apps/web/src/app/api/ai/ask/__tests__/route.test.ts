import { NextRequest } from 'next/server';
import { POST } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { askQuestion } from '@/lib/ai/rag';
import { AIProviderNotConfiguredError, AIProviderRequestError } from '@/lib/ai/errors';
import { MatterNotFoundError, EntitlementDeniedError } from '@/lib/ai/context/gateway';

jest.mock('@/lib/ai/rag');
const mockedAskQuestion = askQuestion as jest.MockedFunction<typeof askQuestion>;

const TENANT_ID = '00000000-0000-4000-8000-000000000ab1';
const USER_ID = '00000000-0000-4000-8000-000000000ab2';

async function sessionCookieHeader(): Promise<string> {
  const token = await signSessionToken({ sub: USER_ID, tenantId: TENANT_ID, email: 'ai-ask-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(headers: Record<string, string>, body?: unknown): NextRequest {
  return new NextRequest(new URL('http://localhost/api/ai/ask'), {
    method: 'POST',
    headers: { origin: 'http://localhost:3000', 'content-type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe('POST /api/ai/ask', () => {
  beforeEach(() => {
    mockedAskQuestion.mockReset();
  });

  test('rejects with no session (401)', async () => {
    const res = await POST(buildRequest({}, { question: 'test?' }));
    expect(res.status).toBe(401);
  });

  test('rejects a malformed body (400)', async () => {
    const res = await POST(
      new NextRequest(new URL('http://localhost/api/ai/ask'), {
        method: 'POST',
        headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader() },
        body: 'not json',
      })
    );
    expect(res.status).toBe(400);
  });

  test('rejects an empty question (400)', async () => {
    const res = await POST(buildRequest({ cookie: await sessionCookieHeader() }, { question: '' }));
    expect(res.status).toBe(400);
  });

  test('returns 422 when no indexed context is found', async () => {
    mockedAskQuestion.mockResolvedValue({ status: 'NO_CONTEXT_FOUND' });
    const res = await POST(buildRequest({ cookie: await sessionCookieHeader() }, { question: 'test?' }));
    expect(res.status).toBe(422);
  });

  test('returns 503 when the AI provider is not configured', async () => {
    mockedAskQuestion.mockRejectedValue(new AIProviderNotConfiguredError());
    const res = await POST(buildRequest({ cookie: await sessionCookieHeader() }, { question: 'test?' }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe('AI_PROVIDER_NOT_CONFIGURED');
  });

  test('returns 502 when the upstream provider request fails', async () => {
    mockedAskQuestion.mockRejectedValue(new AIProviderRequestError('boom', 'openai'));
    const res = await POST(buildRequest({ cookie: await sessionCookieHeader() }, { question: 'test?' }));
    expect(res.status).toBe(502);
  });

  test('returns the answer and sources on success', async () => {
    mockedAskQuestion.mockResolvedValue({
      status: 'ANSWERED',
      answer: 'The answer is 42.',
      sources: [{ index: 1, id: 'chunk-1', envelope_id: 'env-1', chunk_index: 0, snippet: 'context' }],
      provider: 'openai',
      model: 'gpt-4o-mini',
    });
    const res = await POST(buildRequest({ cookie: await sessionCookieHeader() }, { question: 'What is the answer?' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.answer).toBe('The answer is 42.');
    expect(body.sources).toHaveLength(1);
    // estimated_provider_tokens/estimated_cost_usd must never reach the
    // client (Milestone 2, Decision 7) — instrumentation only.
    expect(body).not.toHaveProperty('estimated_provider_tokens');
    expect(body).not.toHaveProperty('estimated_cost_usd');
    expect(mockedAskQuestion).toHaveBeenCalledWith(TENANT_ID, USER_ID, 'What is the answer?', {
      caseId: null,
      matterId: null,
    });
  });

  test('passes matter_id through to askQuestion when provided', async () => {
    const matterId = '00000000-0000-4000-8000-000000000ac1';
    mockedAskQuestion.mockResolvedValue({
      status: 'ANSWERED',
      answer: 'Grounded in matter context.',
      sources: [],
      provider: 'openai',
      model: 'gpt-4o-mini',
    });
    const res = await POST(
      buildRequest({ cookie: await sessionCookieHeader() }, { question: 'What is next?', matter_id: matterId })
    );
    expect(res.status).toBe(200);
    expect(mockedAskQuestion).toHaveBeenCalledWith(TENANT_ID, USER_ID, 'What is next?', {
      caseId: null,
      matterId,
    });
  });

  test('rejects an invalid matter_id format (400)', async () => {
    const res = await POST(
      buildRequest({ cookie: await sessionCookieHeader() }, { question: 'test?', matter_id: 'not-a-uuid' })
    );
    expect(res.status).toBe(400);
  });

  test('returns 404 when the matter belongs to another tenant or does not exist', async () => {
    mockedAskQuestion.mockRejectedValue(new MatterNotFoundError());
    const res = await POST(
      buildRequest(
        { cookie: await sessionCookieHeader() },
        { question: 'test?', matter_id: '00000000-0000-4000-8000-000000000ac2' }
      )
    );
    expect(res.status).toBe(404);
  });

  test('returns 403 when entitlement is denied', async () => {
    mockedAskQuestion.mockRejectedValue(new EntitlementDeniedError('Trial expired.'));
    const res = await POST(buildRequest({ cookie: await sessionCookieHeader() }, { question: 'test?' }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('ENTITLEMENT_DENIED');
  });

  test('rejects an untrusted origin (403)', async () => {
    const res = await POST(
      new NextRequest(new URL('http://localhost/api/ai/ask'), {
        method: 'POST',
        headers: { origin: 'https://evil.example.com', cookie: await sessionCookieHeader() },
        body: JSON.stringify({ question: 'test?' }),
      })
    );
    expect(res.status).toBe(403);
  });
});
