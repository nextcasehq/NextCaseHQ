import { NextRequest } from 'next/server';
import { GET } from '../route';
import { signSessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient, closePool } from '@/lib/db/db-client';
import { indexDocument } from '@/lib/search/indexing';
import { putObject, deleteObject } from '@/lib/storage/object-storage';

const TENANT_A = '00000000-0000-4000-8000-000000000f21';
const TENANT_B = '00000000-0000-4000-8000-000000000f22';
const USER_ID = '00000000-0000-4000-8000-000000000f23';

async function sessionCookieHeader(tenantId: string): Promise<string> {
  const token = await signSessionToken({ sub: USER_ID, tenantId, email: 'search-test@nextcase.local' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function buildRequest(url: string, headers: Record<string, string>): NextRequest {
  return new NextRequest(new URL(url), { headers });
}

interface SearchResultGroup {
  type: string;
  providerName: string;
  items: Array<{ id: string; title: string; snippet: string; score: number; href: string; metadata?: Record<string, unknown> }>;
}

function group(body: { groups: SearchResultGroup[] }, type: string): SearchResultGroup {
  const found = body.groups.find((g) => g.type === type);
  if (!found) throw new Error(`No "${type}" group in response: ${JSON.stringify(body.groups.map((g) => g.type))}`);
  return found;
}

const hasS3 = () => Boolean(process.env.S3_ENDPOINT);

describe('GET /api/search — Universal Search (Milestone 5, Option C Search Service)', () => {
  const db = new DatabaseClient();
  const uploadedObjectKeys: string[] = [];

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Search Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Search Test Tenant B',
    ]);
  });

  afterAll(async () => {
    await Promise.all(uploadedObjectKeys.map((key) => deleteObject(key).catch(() => {})));
    await db.execute(TENANT_A, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_B]);
    // CourtNote is append-only by grant (REVOKE UPDATE, DELETE) and its
    // case_id/matter_id FKs are RESTRICT, not CASCADE — the Matter/
    // LegalCase/Client rows this file creates are therefore left in place
    // rather than deleted, matching the same precedent already established
    // for AiUsageEvent-referenced rows elsewhere in this codebase's test
    // suite (see lib/ai/__tests__/rag.test.ts). TENANT_A/TENANT_B are
    // unique to this file, so leftover rows never affect another test.
    await closePool();
  });

  async function createAndIndexDocument(
    tenantId: string,
    content: string,
    matterId: string | null = null
  ): Promise<string> {
    const documentId = crypto.randomUUID();
    const objectKey = `${tenantId}/${documentId}/file.txt`;
    await putObject(objectKey, Buffer.from(content), 'text/plain');
    uploadedObjectKeys.push(objectKey);
    await db.execute(
      tenantId,
      `INSERT INTO "DocumentEnvelope" (id, tenant_id, matter_id, title, storage_structure) VALUES ($1, $2, $3, $4, $5)`,
      [documentId, tenantId, matterId, 'file.txt', { object_key: objectKey, content_type: 'text/plain' }]
    );
    await indexDocument(tenantId, documentId);
    return documentId;
  }

  test('rejects with no session (401)', async () => {
    const res = await GET(buildRequest('http://localhost/api/search?q=contract', {}));
    expect(res.status).toBe(401);
  });

  test('rejects a missing q parameter with 400', async () => {
    const res = await GET(
      buildRequest('http://localhost/api/search', { cookie: await sessionCookieHeader(TENANT_A) })
    );
    expect(res.status).toBe(400);
  });

  test('rejects an unrecognized type filter with 400', async () => {
    const res = await GET(
      buildRequest('http://localhost/api/search?q=contract&type=NOT_A_PROVIDER', {
        cookie: await sessionCookieHeader(TENANT_A),
      })
    );
    expect(res.status).toBe(400);
  });

  test('returns one group per registered provider by default', async () => {
    const res = await GET(
      buildRequest('http://localhost/api/search?q=zzz-no-match-zzz', { cookie: await sessionCookieHeader(TENANT_A) })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const types = body.groups.map((g: SearchResultGroup) => g.type).sort();
    expect(types).toEqual(['CLIENT', 'COURT_NOTE', 'DOCUMENT', 'MATTER', 'PROCEEDING']);
  });

  test('the type filter restricts which provider groups are returned', async () => {
    const res = await GET(
      buildRequest('http://localhost/api/search?q=zzz-no-match-zzz&type=document,matter', {
        cookie: await sessionCookieHeader(TENANT_A),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const types = body.groups.map((g: SearchResultGroup) => g.type).sort();
    expect(types).toEqual(['DOCUMENT', 'MATTER']);
  });

  test('finds a full-text document match via the plain q term (DocumentSearchProvider, hybridSearch unchanged)', async () => {
    if (!hasS3()) return;
    await createAndIndexDocument(TENANT_A, 'The defendant breached the contract and owes damages. '.repeat(20));

    const res = await GET(
      buildRequest('http://localhost/api/search?q=breached%20contract&type=document', {
        cookie: await sessionCookieHeader(TENANT_A),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const documentGroup = group(body, 'DOCUMENT');
    expect(documentGroup.items.length).toBeGreaterThan(0);
    expect(documentGroup.items[0].snippet).toContain('breached the contract');
    // DocumentSearchProvider's own added value over raw hybridSearch()
    // output: the real DocumentEnvelope.title, not just an envelope_id.
    expect(documentGroup.items[0].title).toBe('file.txt');
  });

  test('document search never returns another tenant\'s chunks', async () => {
    if (!hasS3()) return;
    const tenantBDocId = await createAndIndexDocument(
      TENANT_B,
      'Tenant B private confidential settlement terms. '.repeat(20)
    );

    const res = await GET(
      buildRequest('http://localhost/api/search?q=confidential%20settlement&type=document', {
        cookie: await sessionCookieHeader(TENANT_A),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const documentGroup = group(body, 'DOCUMENT');
    expect(documentGroup.items.every((item) => item.metadata?.envelope_id !== tenantBDocId)).toBe(true);

    const resB = await GET(
      buildRequest('http://localhost/api/search?q=confidential%20settlement&type=document', {
        cookie: await sessionCookieHeader(TENANT_B),
      })
    );
    const bodyB = await resB.json();
    expect(group(bodyB, 'DOCUMENT').items.some((item) => item.metadata?.envelope_id === tenantBDocId)).toBe(true);
  });

  test('document search filters by matter_id — a document linked to another Matter is excluded', async () => {
    if (!hasS3()) return;
    const matterRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Search Filter Test Matter']
    );
    const matterId = matterRows[0].id;

    const matterDocId = await createAndIndexDocument(
      TENANT_A,
      'litigation strategy memorandum regarding discovery obligations. '.repeat(20),
      matterId
    );
    const unlinkedDocId = await createAndIndexDocument(
      TENANT_A,
      'litigation strategy memorandum regarding discovery obligations. '.repeat(20),
      null
    );

    const res = await GET(
      buildRequest(`http://localhost/api/search?q=discovery%20obligations&matter_id=${matterId}&type=document`, {
        cookie: await sessionCookieHeader(TENANT_A),
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const documentGroup = group(body, 'DOCUMENT');
    expect(documentGroup.items.some((item) => item.metadata?.envelope_id === matterDocId)).toBe(true);
    expect(documentGroup.items.every((item) => item.metadata?.envelope_id !== unlinkedDocId)).toBe(true);
  });

  test('MatterSearchProvider finds a Matter by title and never leaks across tenants', async () => {
    const matterRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Sterling Exports Arbitration']
    );
    const matterId = matterRows[0].id;

    const res = await GET(
      buildRequest('http://localhost/api/search?q=Sterling%20Exports&type=matter', {
        cookie: await sessionCookieHeader(TENANT_A),
      })
    );
    expect(res.status).toBe(200);
    const matterGroup = group(await res.json(), 'MATTER');
    expect(matterGroup.items.some((item) => item.id === matterId)).toBe(true);

    const resB = await GET(
      buildRequest('http://localhost/api/search?q=Sterling%20Exports&type=matter', {
        cookie: await sessionCookieHeader(TENANT_B),
      })
    );
    const matterGroupB = group(await resB.json(), 'MATTER');
    expect(matterGroupB.items.every((item) => item.id !== matterId)).toBe(true);
  });

  test('ProceedingSearchProvider finds a Proceeding by case_number and respects matter_id scoping', async () => {
    const matterRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'Proceeding Scope Test Matter']
    );
    const matterId = matterRows[0].id;
    const otherMatterRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Matter" (tenant_id, title) VALUES ($1, $2) RETURNING id`,
      [TENANT_A, 'A Different Matter']
    );
    const otherMatterId = otherMatterRows[0].id;

    const caseRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code, case_number, matter_id) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [TENANT_A, 'Scoped Proceeding', 'IN', 'DL-HC-2026-CASE-999', matterId]
    );
    const caseId = caseRows[0].id;

    const res = await GET(
      buildRequest(`http://localhost/api/search?q=DL-HC-2026-CASE-999&type=proceeding&matter_id=${matterId}`, {
        cookie: await sessionCookieHeader(TENANT_A),
      })
    );
    const proceedingGroup = group(await res.json(), 'PROCEEDING');
    expect(proceedingGroup.items.some((item) => item.id === caseId)).toBe(true);

    const resOtherMatter = await GET(
      buildRequest(`http://localhost/api/search?q=DL-HC-2026-CASE-999&type=proceeding&matter_id=${otherMatterId}`, {
        cookie: await sessionCookieHeader(TENANT_A),
      })
    );
    const proceedingGroupOther = group(await resOtherMatter.json(), 'PROCEEDING');
    expect(proceedingGroupOther.items.every((item) => item.id !== caseId)).toBe(true);
  });

  test('ClientSearchProvider finds a Client by name', async () => {
    const clientRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "Client" (tenant_id, name, email) VALUES ($1, $2, $3) RETURNING id`,
      [TENANT_A, 'Quantum Ridge Holdings', 'contact@quantumridge.example']
    );
    const clientId = clientRows[0].id;

    const res = await GET(
      buildRequest('http://localhost/api/search?q=Quantum%20Ridge&type=client', {
        cookie: await sessionCookieHeader(TENANT_A),
      })
    );
    const clientGroup = group(await res.json(), 'CLIENT');
    expect(clientGroup.items.some((item) => item.id === clientId)).toBe(true);
    // No dedicated Client page exists yet — href is honestly empty, not guessed.
    expect(clientGroup.items.find((item) => item.id === clientId)?.href).toBe('');
  });

  test('CourtNoteSearchProvider finds a Court Note by its text and is tenant-isolated', async () => {
    const caseRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "LegalCase" (tenant_id, title, country_code) VALUES ($1, $2, $3) RETURNING id`,
      [TENANT_A, 'Court Note Search Test Case', 'IN']
    );
    const caseId = caseRows[0].id;
    await db.execute(
      TENANT_A,
      `INSERT INTO "User" (id, tenant_id, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [USER_ID, TENANT_A, 'search-test@nextcase.local']
    );
    const noteRows = await db.execute<{ id: string }>(
      TENANT_A,
      `INSERT INTO "CourtNote" (tenant_id, case_id, author_user_id, hearing_date, court_forum_type, court_forum_display, stage, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [TENANT_A, caseId, USER_ID, '2026-07-19', 'HIGH_COURT', 'High Court', 'Arguments', 'Adjourned pending discovery of bank statements.']
    );
    const noteId = noteRows[0].id;

    const res = await GET(
      buildRequest('http://localhost/api/search?q=discovery%20of%20bank%20statements&type=court_note', {
        cookie: await sessionCookieHeader(TENANT_A),
      })
    );
    const courtNoteGroup = group(await res.json(), 'COURT_NOTE');
    expect(courtNoteGroup.items.some((item) => item.id === noteId)).toBe(true);

    const resB = await GET(
      buildRequest('http://localhost/api/search?q=discovery%20of%20bank%20statements&type=court_note', {
        cookie: await sessionCookieHeader(TENANT_B),
      })
    );
    const courtNoteGroupB = group(await resB.json(), 'COURT_NOTE');
    expect(courtNoteGroupB.items.every((item) => item.id !== noteId)).toBe(true);
    // CourtNote is append-only by grant (REVOKE UPDATE, DELETE) — this row
    // is intentionally left in place, matching afterAll's own note above.
  });
});
