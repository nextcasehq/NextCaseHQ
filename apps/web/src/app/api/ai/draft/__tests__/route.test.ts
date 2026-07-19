import { NextRequest } from 'next/server';
import { POST } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { generateDraft } from '@/lib/ai/draft';
import { AIProviderNotConfiguredError, AIProviderRequestError } from '@/lib/ai/errors';
import { MatterNotFoundError, EntitlementDeniedError } from '@/lib/ai/context/gateway';

jest.mock('@/lib/ai/draft');
const mockedGenerateDraft = generateDraft as jest.MockedFunction<typeof generateDraft>;

const TENANT_ID = '00000000-0000-4000-8000-000000000bd1';
const USER_ID = '00000000-0000-4000-8000-000000000bd2';

async function sessionCookieHeader(): Promise<string> {
  return `${SESSION_COOKIE_NAME}=${await signSessionToken({ sub: USER_ID, tenantId: TENANT_ID, email: 'ai-draft-test@nextcase.local' })}`;
}

function buildRequest(headers: Record<string, string>, body?: unknown): NextRequest {
  return new NextRequest(new URL('http://localhost/api/ai/draft'), {
    method: 'POST',
    headers: { origin: 'http://localhost:3000', 'content-type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const validCreateBody = {
  document_type: 'PLAINT',
  category: 'CIVIL',
  facts: { plaintiff_petitioner: 'A', defendant_respondent: 'B' },
  mode: 'CREATE',
};

describe('POST /api/ai/draft', () => {
  beforeEach(() => {
    mockedGenerateDraft.mockReset();
  });

  test('rejects with no session (401)', async () => {
    const res = await POST(buildRequest({}, validCreateBody));
    expect(res.status).toBe(401);
  });

  test('rejects an untrusted origin (403)', async () => {
    const res = await POST(
      new NextRequest(new URL('http://localhost/api/ai/draft'), {
        method: 'POST',
        headers: { origin: 'https://evil.example.com', cookie: await sessionCookieHeader() },
        body: JSON.stringify(validCreateBody),
      })
    );
    expect(res.status).toBe(403);
  });

  test('rejects a malformed body (400)', async () => {
    const res = await POST(
      new NextRequest(new URL('http://localhost/api/ai/draft'), {
        method: 'POST',
        headers: { origin: 'http://localhost:3000', cookie: await sessionCookieHeader() },
        body: 'not json',
      })
    );
    expect(res.status).toBe(400);
  });

  test('rejects an unrecognized document_type (400)', async () => {
    const res = await POST(
      buildRequest({ cookie: await sessionCookieHeader() }, { ...validCreateBody, document_type: 'NOT_A_TYPE' })
    );
    expect(res.status).toBe(400);
    expect(mockedGenerateDraft).not.toHaveBeenCalled();
  });

  test('rejects a document_type/category mismatch (400)', async () => {
    const res = await POST(
      buildRequest({ cookie: await sessionCookieHeader() }, { ...validCreateBody, document_type: 'BAIL_APPLICATION', category: 'CIVIL' })
    );
    expect(res.status).toBe(400);
    expect(mockedGenerateDraft).not.toHaveBeenCalled();
  });

  test('rejects IMPROVE mode without existing_content (400)', async () => {
    const res = await POST(
      buildRequest({ cookie: await sessionCookieHeader() }, { ...validCreateBody, mode: 'IMPROVE' })
    );
    expect(res.status).toBe(400);
    expect(mockedGenerateDraft).not.toHaveBeenCalled();
  });

  test('rejects an invalid matter_id format (400)', async () => {
    const res = await POST(
      buildRequest({ cookie: await sessionCookieHeader() }, { ...validCreateBody, matter_id: 'not-a-uuid' })
    );
    expect(res.status).toBe(400);
  });

  test('returns 503 when the AI provider is not configured', async () => {
    mockedGenerateDraft.mockRejectedValue(new AIProviderNotConfiguredError());
    const res = await POST(buildRequest({ cookie: await sessionCookieHeader() }, validCreateBody));
    expect(res.status).toBe(503);
  });

  test('returns 502 when the upstream provider request fails', async () => {
    mockedGenerateDraft.mockRejectedValue(new AIProviderRequestError('boom', 'openai'));
    const res = await POST(buildRequest({ cookie: await sessionCookieHeader() }, validCreateBody));
    expect(res.status).toBe(502);
  });

  test('returns 404 when the matter belongs to another tenant or does not exist', async () => {
    mockedGenerateDraft.mockRejectedValue(new MatterNotFoundError());
    const res = await POST(
      buildRequest(
        { cookie: await sessionCookieHeader() },
        { ...validCreateBody, matter_id: '00000000-0000-4000-8000-000000000bd3' }
      )
    );
    expect(res.status).toBe(404);
  });

  test('returns 403 when entitlement is denied', async () => {
    mockedGenerateDraft.mockRejectedValue(new EntitlementDeniedError('Trial expired.'));
    const res = await POST(buildRequest({ cookie: await sessionCookieHeader() }, validCreateBody));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('ENTITLEMENT_DENIED');
  });

  test('returns the generated draft on success and never persists (CREATE)', async () => {
    mockedGenerateDraft.mockResolvedValue({ content: 'Draft text.', provider: 'openai', model: 'gpt-4o-mini' });
    const res = await POST(buildRequest({ cookie: await sessionCookieHeader() }, validCreateBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: 'GENERATED', content: 'Draft text.', provider: 'openai', model: 'gpt-4o-mini' });
    expect(mockedGenerateDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        userId: USER_ID,
        documentTypeSlug: 'PLAINT',
        category: 'CIVIL',
        mode: 'CREATE',
        matterId: null,
      })
    );
  });

  test('passes existing_content/improve_instruction through for IMPROVE mode', async () => {
    mockedGenerateDraft.mockResolvedValue({ content: 'Revised text.', provider: 'openai', model: 'gpt-4o-mini' });
    const res = await POST(
      buildRequest(
        { cookie: await sessionCookieHeader() },
        {
          ...validCreateBody,
          mode: 'IMPROVE',
          existing_content: 'Old text.',
          improve_instruction: 'Tighten the reliefs sought.',
        }
      )
    );
    expect(res.status).toBe(200);
    expect(mockedGenerateDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'IMPROVE',
        existingContent: 'Old text.',
        improveInstruction: 'Tighten the reliefs sought.',
      })
    );
  });
});
